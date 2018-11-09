function Summary(props) {
    return (
        <ul>
            <li>Data source: {props.url}</li>
            <li>Title: {props.fieldMap.title}</li>
            <li>Content: {props.fieldMap.content}</li>
        </ul>
    );
}

export default Summary;