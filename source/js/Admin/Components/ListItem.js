import DragItem from './DragItem';
import uuidv1 from "uuid/v1";

const ListItem = ({field, value, sample, children, fieldMap, onClickContainer, translation}) => {
    if (fieldMap.itemContainer === null) {
        if (children) {
            return (<li>
                {Array.isArray(value) ?
                    <span><strong>
                    <span className="dashicons dashicons-portfolio"></span> {field}
                        <a href="#" className="tree-select" onClick={onClickContainer}>{translation.select}</a>
                    </strong></span> :
                    <span>{field}</span>}

                <ul>{children}</ul>
            </li>);
        } else {
            return <li><span>{field}</span></li>;
        }
    } else {
        if (children) {
            return <ul>{children}</ul>;
        } else {
            const item = {
                field: field,
                value: value,
                sample: sample
            };
            return (
                <li>
                    <DragItem
                        id={uuidv1()}
                        heading={field}
                        item={item}
                    />
                </li>
            );
        }
    }
};

export default ListItem;