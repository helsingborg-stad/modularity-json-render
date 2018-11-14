const ListItem = ({value, children, fieldMap, object, onClickTitle, onClickContent, onClickContainer}) => {
    if (children) {
        return (<li>
            {Array.isArray(object) && fieldMap.itemContainer === null ?
                <span><span className="dashicons dashicons-portfolio"></span> {value} <a href="#" className="tree-select" data-field="itemContainer" onClick={onClickContainer}>Select</a></span> :  <span>{value}</span>}
            <ul>{children}</ul>
        </li>);
    } else {
        return (<li>
            {fieldMap.title === object && fieldMap.title ? <strong>Title: </strong> : ''}
            {fieldMap.content === object && fieldMap.content ? <strong>Content: </strong> : ''}
            <span>{value}</span>
            {!fieldMap.title && (fieldMap.content !== object) && fieldMap.itemContainer !== null ?
                <a href="#" className="tree-select" data-field="title" onClick={onClickTitle}>Title</a> : ''}
            {!fieldMap.content && (fieldMap.title !== object) && fieldMap.itemContainer !== null ?
                <a href="#" className="tree-select" data-field="content" onClick={onClickContent}>Content</a> : ''}
        </li>);
    }
};

export default ListItem;