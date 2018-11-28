import {DragSource, DropTarget} from 'react-dnd';

class DragItem extends React.Component {
    render() {
        const {item, isDragging, connectDragSource, connectDropTarget} = this.props;
        const opacity = isDragging ? 0 : 1;

        return connectDragSource(connectDropTarget(
            <span className="drag-item" style={{ opacity }}><strong>{item.field}</strong> : {typeof item.sample === 'string' || typeof item.sample === 'number' ? item.sample :
                <i>Empty</i>}</span>
        ));
    }
}

const itemSource = {
    beginDrag(props) {
        return {
            id: props.id,
            index: props.index,
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