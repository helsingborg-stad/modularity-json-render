import {DropTarget} from 'react-dnd';
import DragItem from "./DragItem";
import update from 'immutability-helper';

class DropArea extends React.Component {
    constructor(props) {
        super(props);
        this.state = {items: props.list};
    }

    itemsChange() {
        this.props.itemsChange(this.props.id, this.state.items);
    }

    pushItem(newItem) {
        this.setState(update(this.state, {
            items: {
                $push: [newItem]
            }
        }));
        this.itemsChange();
    }

    removeItem(index) {
        this.setState(update(this.state, {
            items: {
                $splice: [
                    [index, 1]
                ]
            }
        }));
        this.itemsChange();
    }

    moveItem(dragIndex, hoverIndex) {
        const {items} = this.state;
        const dragItem = items[dragIndex];

        this.setState(update(this.state, {
            items: {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, dragItem]
                ]
            }
        }));
        this.itemsChange();
    }

    changeHeading(index, e) {
        this.setState(update(this.state, {
            items: {
                [index]: {
                    heading: {
                        $set: e.target.value
                    }
                }
            }
        }), () => {
            this.itemsChange();
        });
    }

    render() {
        const {items} = this.state;
        const {isOver, connectDropTarget, canDrop} = this.props;
        let backgroundColor = canDrop ? 'palegreen' : 'palevioletred';
        backgroundColor = isOver ? backgroundColor : '#FFF';

        return connectDropTarget(
            <div className="drop-area" style={{backgroundColor}}>
                {items.map((item, i) => {
                    return (
                        <DragItem
                            key={item.id}
                            id={item.id}
                            index={i}
                            listId={this.props.id}
                            heading={item.heading}
                            headingChange={e => this.changeHeading(i, e)}
                            item={item.item}
                            removeItem={this.removeItem.bind(this)}
                            moveItem={this.moveItem.bind(this)}
                        />
                    );
                })}
            </div>
        );
    }
}

const itemTarget = {
    drop(props, monitor, component) {
        const {id} = props;
        const sourceObj = monitor.getItem();

        if (id !== sourceObj.listId) {
            component.pushItem(sourceObj);
        } else {
            return {listId: id};
        }
    },
    canDrop(props, monitor) {
        if (props.limit === null) {
            return true;
        }
        return props.list.length < props.limit;
    }
};

export default DropTarget('jsonItem', itemTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
}))(DropArea);
