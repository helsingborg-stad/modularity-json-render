import {DropTarget} from 'react-dnd';
import DragItem from "./DragItem";
import update from 'immutability-helper';

const itemTarget = {
    drop(props, monitor, component) {
        const {id} = props;
        const sourceObj = monitor.getItem();

        if (id !== sourceObj.listId) {
            console.log("Drop");
            console.log(sourceObj);
            component.pushItem(sourceObj);
        } else {
            console.log("same list, return");
            return {listId: id};
        }
    }
};

class DropArea extends React.Component {
    constructor(props) {
        super(props);
        this.state = {items: props.list};
    }

    pushItem(newItem) {
        this.setState(update(this.state, {
            items: {
                $push: [newItem]
            }
        }));
    }

    removeItem(index) {
        this.setState(update(this.state, {
            items: {
                $splice: [
                    [index, 1]
                ]
            }
        }));
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
    }

    render() {
        const {items} = this.state;
        const {isOver, connectDropTarget} = this.props;
        const backgroundColor = isOver ? 'palegreen' : '#FFF';

        return connectDropTarget(
            <div className="drop-area" style={{backgroundColor}}>
                {items.map((item, i) => {
                    console.log("The item:");
                    console.log(item);
                    return (
                        <DragItem
                            key={item.id}
                            index={i}
                            listId={this.props.id}
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

export default DropTarget('jsonItem', itemTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
}))(DropArea);
