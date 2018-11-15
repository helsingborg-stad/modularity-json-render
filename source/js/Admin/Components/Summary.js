const Summary = ({url, fieldMap, translation}) =>
    <div>
        <p>
            <strong>API URL</strong><br/>
            <a href={url} target="_blank">{url}</a>
        </p>
        <p>
            <strong>{translation.title}</strong><br/>
            {fieldMap.title.replace('.', ' –> ')}
        </p>
        <p>
            <strong>{translation.content}</strong><br/>
            {fieldMap.content.replace('.', ' –> ')}
        </p>
    </div>;

export default Summary;