function ListItem(props) {
    const {value, children, fieldMap, object, onClickTitle, onClickContent, onClickContainer} = props;
    return (<li>
        {fieldMap.title === object && fieldMap.title  ? <strong>Title: </strong> : ''}
        {fieldMap.content === object && fieldMap.content ? <strong>Content: </strong> : ''}
        {children ? <strong>{value}</strong> : <span>{value}</span>}
        {!children && !fieldMap.title && (fieldMap.content !== object) && fieldMap.itemContainer !== null ?
            <a href="#" className="button button-small" data-field="title" onClick={onClickTitle}>Title</a> : ''}
        {!children && (fieldMap.title !== object) && !fieldMap.content && fieldMap.itemContainer !== null ?
            <a href="#" className="button button-small" data-field="content"
               onClick={onClickContent}>Content</a> : ''}
        {children && Array.isArray(object) && fieldMap.itemContainer === null ?
            <a href="#" className="button button-small" data-field="itemContainer"
               onClick={onClickContainer}>Select</a> : ''}
        {children ? <span className="dashicons dashicons-arrow-down"></span> : ''}
        {children ? <ul className="sub-object">{children}</ul> : ''}
    </li>);
}

export default ListItem;