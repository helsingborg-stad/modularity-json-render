import {DragSource, DropTarget} from 'react-dnd';

class DragItem extends React.Component {
    render() {
        const {listId, item, heading, headingChange, removeItem, index} = this.props;
        const {isDragging, connectDragSource, connectDropTarget} = this.props;
        const opacity = isDragging ? 'transparent' : '';

        let sample = typeof item.sample === 'string' || typeof item.sample === 'number' ? item.sample : '';
        sample = (sample.length > 50) ? sample.substring(0, 50) + '...' : sample;

        return connectDragSource(connectDropTarget(
            <div className={`drag-item drag-item--${opacity}`}>
                <p>
                    <strong>{item.field}:</strong> <i>{sample}</i>
                    {listId && <a href="#" className="remove-item" onClick={(e) => {e.preventDefault(); removeItem(index);}}><span className="dashicons dashicons-no"></span></a>}
                </p>
                {listId && <p><strong>Title:</strong><input type="text" name="" onChange={headingChange} value={heading} className=".regular-text"/></p>}
            </div>
        ));
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

        // Dragging downwards
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
            return;
        }

        // Dragging upwards
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
            return;
        }

        // Perform the action
        if (props.listId === sourceListId) {
            props.moveItem(dragIndex, hoverIndex);
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