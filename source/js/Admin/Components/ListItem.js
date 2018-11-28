import DragItem from './DragItem';
import uuidv1 from "uuid/v1";

const ListItem = ({field, value, sample, children, fieldMap, onClickTitle, onClickContainer, translation}) => {
    if (children) {
        return (<li>
            {Array.isArray(value) && fieldMap.itemContainer === null ?
                <span><strong>
                    <span className="dashicons dashicons-portfolio"></span> {field}
                    <a href="#"
                       className="tree-select"
                       data-field="itemContainer"
                       onClick={onClickContainer}>{translation.select}</a>
                    </strong></span> :
                <span>{field}</span>}
            <ul>{children}</ul>
        </li>);
    } else {
        const item = {
            field: field,
            value: value,
            sample: sample
        };

        return (
            <li>{fieldMap.itemContainer === null ? <span>{field}</span> :
                <DragItem
                    id={uuidv1()}
                    item={item}
                />
            }</li>
        );
    }
};

export default ListItem;