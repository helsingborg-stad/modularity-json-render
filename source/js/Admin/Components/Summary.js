const Summary = ({url, fieldMap, translation}) =>
    <div>
        <h3>{translation.summary}</h3>
        <p>{translation.summaryDescription}</p>
        <p>
            <strong>API URL</strong><br/>
            <a href={url} target="_blank">{url}</a>
        </p>
        <p>
            <strong>{translation.titleField}</strong><br/>
            {fieldMap.title.replace('.', ' –> ')}
        </p>
        <p>
            <strong>{translation.contentField}</strong><br/>
            {fieldMap.content.replace('.', ' –> ')}
        </p>
    </div>;

export default Summary;