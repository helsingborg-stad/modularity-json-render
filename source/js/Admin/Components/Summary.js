function Summary(props) {
    return (
        <ul>
            <li style={{wordBreak: 'break-all'}}>Data source: {props.url}</li>
            <li>Title: {props.fieldMap.title}</li>
            <li>Content: {props.fieldMap.content}</li>
        </ul>
    );
}

export default Summary;