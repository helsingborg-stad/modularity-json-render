import {translation} from '../Config/config';
import {DragSource, DropTarget} from 'react-dnd';

class DragItem extends React.Component {
    render() {
        const {listId, item, heading, headingChange, removeItem, index} = this.props;
        const {isDragging, connectDragSource, connectDropTarget} = this.props;
        const opacity = isDragging && listId ? 'drop-area__item--transparent' : '';

        let sample = typeof item.sample === 'string' || typeof item.sample === 'number' ? item.sample : '';
        sample = (sample.length > 50) ? sample.substring(0, 50) + '...' : sample;

        return connectDragSource(connectDropTarget(
            <div className={`drop-area__item ${opacity}`}>
                <div className="menu-item-bar">
                    <div className="menu-item-handle">
                        <span className="item-title">
                            <span className="menu-item-title">{item.field}</span>
                        </span>
                        <span className="item-controls">
                            {listId &&
                            <a href="#" className="item-edit" onClick={(e) => {e.preventDefault();removeItem(index);}}></a>
                            }
                        </span>
                    </div>
                </div>
                <div className="menu-item-settings wp-clearfix">
                    <p className="description description-wide">
                        {translation.value}: {sample}
                    </p>
                    {listId &&
                    <p className="description description-wide">
                        <label>
                            {translation.title}<br/>
                            <input type="text" name="" onChange={headingChange} value={heading} className="large-text"/>
                        </label>
                    </p>
                    }
                </div>
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