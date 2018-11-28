import {DragSource, DropTarget} from 'react-dnd';

class DragItem extends React.Component {
    render() {
        const {listId, item, heading, headingChange} = this.props;
        const {isDragging, connectDragSource, connectDropTarget} = this.props;
        const opacity = isDragging ? 0 : 1;

        let sample = typeof item.sample === 'string' || typeof item.sample === 'number' ? item.sample : 'Empty';
        sample = (sample.length > 50) ? sample.substring(0, 50) + '...' : sample;

        if (listId) {
            return connectDragSource(connectDropTarget(
                <div className="drag-item" style={{opacity}}>
                    <p><strong>{item.field}:</strong> <i>{sample}</i></p>
                    <p><strong>Title:</strong><input type="text" name="" onChange={headingChange} value={heading} className=".regular-text"/></p>
                </div>
            ));
        } else {
            return connectDragSource(connectDropTarget(
                <div className="drag-item" style={{opacity}}>
                    <strong>{item.field}:</strong> <i>{sample}</i>
                </div>
            ));
        }
    }
}

const itemSource = {
    beginDrag(props) {
        return {
            id: props.id,
            index: props.index,
            heading: props.heading,
            listId: props.listId,
            item: props.item
        };
    },

    endDrag(props, monitor, component) {
        const item = monitor.getItem();
        const dropResult = monitor.getDropResult();

        if (dropResult && dropResult.listId !== item.listId) {
            props.removeItem(item.index);
        }
    }
};

const itemTarget = {
    hover(props, monitor, component) {
        const dragIndex = monitor.getItem().index;
        const hoverIndex = props.index;
        const sourceListId = monitor.getItem().listId;

        // Don't replace items with themselves
        if (dragIndex === hoverIndex) {
            return;
        }

        // Determine rectangle on screen
        const hoverBoundingRect = ReactDOM.findDOMNode(component).getBoundingClientRect();

        // Get vertical middle
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

        // Determine mouse position
        const clientOffset = monitor.getClientOffset();

        // Get pixels to the top
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        // Only perform the move when the mouse has crossed half of the items height
        // When dragging downwards, only move when the cursor is below 50%
        // When dragging upwards, only move when the cursor is above 50%

        // Dragging downwards
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
            return;
        }

        // Dragging upwards
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
            return;
        }

        // Time to actually perform the action
        if (props.listId === sourceListId) {
            props.moveItem(dragIndex, hoverIndex);
            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            monitor.getItem().index = hoverIndex;
        }
    }
};

export default DropTarget('jsonItem', itemTarget, connect => ({
    connectDropTarget: connect.dropTarget()
}))(DragSource('jsonItem', itemSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
}))(DragItem));