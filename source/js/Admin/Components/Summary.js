function Summary(props) {
    return (
        <div>
            <p>
                <strong>Data source</strong><br/>
                <a href={props.url} target="_blank">{props.url}</a>
            </p>
            <p>
                <strong>Title</strong><br/>
                {props.fieldMap.title.replace('.', ' –> ')}
            </p>
            <p>
                <strong>Content</strong><br/>
                {props.fieldMap.content.replace('.', ' –> ')}
            </p>
        </div>
    );
}

export default Summary;