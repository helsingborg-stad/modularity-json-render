function ListItem(props) {
    const {value, children, fieldMap, object, onClickTitle, onClickContent, onClickContainer} = props;

    if (children) {
        return (<li>
            { Array.isArray(object) ? <span><span className="dashicons dashicons-portfolio"></span> <strong>{value}</strong></span> : <span>{value}</span>}

            <span className="dashicons dashicons-arrow-down"></span>

            {Array.isArray(object) && fieldMap.itemContainer === null ?
                <a href="#" className="button button-primary button-small field-select" data-field="itemContainer"
                   onClick={onClickContainer}>Select</a> : ''}

            <ul className="sub-object">{children}</ul>
        </li>);
    } else {
        return (<li>
            {fieldMap.title === object && fieldMap.title ? <strong>Title: </strong> : ''}
            {fieldMap.content === object && fieldMap.content ? <strong>Content: </strong> : ''}

            <span>{value}</span>

            {!fieldMap.title && (fieldMap.content !== object) && fieldMap.itemContainer !== null ?
                <a href="#" className="button button-small" data-field="title" onClick={onClickTitle}>Title</a> : ''}
            {!fieldMap.content && (fieldMap.title !== object) && fieldMap.itemContainer !== null ?
                <a href="#" className="button button-small" data-field="content"
                   onClick={onClickContent}>Content</a> : ''}
        </li>);
    }
}

export default ListItem;