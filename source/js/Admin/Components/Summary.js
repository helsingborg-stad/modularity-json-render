const Summary = ({url, fieldMap}) =>
    <div>
        <p>
            <strong>Data source</strong><br/>
            <a href={url} target="_blank">{url}</a>
        </p>
        <p>
            <strong>Title</strong><br/>
            {fieldMap.title.replace('.', ' –> ')}
        </p>
        <p>
            <strong>Content</strong><br/>
            {fieldMap.content.replace('.', ' –> ')}
        </p>
    </div>;

export default Summary;