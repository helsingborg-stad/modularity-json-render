let {Component} = React;

const initialState = {
    showFieldSelection: false,
    url: '',
    fieldMap: {
        itemContainer: null,
        title: '',
        content: ''
    }
};

export default class Settings extends Component {
    constructor(props) {
        super(props);
        this.state = initialState;

        this.urlChange = this.urlChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.resetOptions = this.resetOptions.bind(this);
        this.updateFieldMap = this.updateFieldMap.bind(this);
    }

    componentDidMount() {
        this.initOptions();
    }

    initOptions() {
        if (typeof modJsonRender.options !== 'undefined') {
            const options = modJsonRender.options;
            this.setState({
                url: options.url ? options.url : '',
                fieldMap: options.fieldMap ? JSON.parse(options.fieldMap) : {itemContainer: null, title: '', content: ''},
                showFieldSelection: !!options.url
            });
        }
    }

    urlChange(event) {
        this.setState({url: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        this.setState({showFieldSelection: true});
    }

    resetOptions(event) {
        event.preventDefault();
        this.setState(initialState);
    }

    updateFieldMap(value) {
        const newVal = Object.assign(this.state.fieldMap, value);
        this.setState({fieldMap: newVal});
    }

    render() {
        const {showFieldSelection, url} = this.state;
        const {itemContainer, title, content} = this.state.fieldMap;

        if (url && itemContainer !== null && title && content) {
            return (
                <div>
                    <Summary {...this.state} />
                    <InputFields {...this.state} />
                    <a href="#" onClick={this.resetOptions} className="button">Reset settings</a>
                </div>
            );
        } else if (showFieldSelection) {
            return (
                <div>
                    <FieldSelection url={url} fieldMap={this.state.fieldMap} updateFieldMap={this.updateFieldMap}/>
                    <InputFields {...this.state} />
                    <a href="#" onClick={this.resetOptions} className="button">Reset settings</a>
                </div>
            );
        } else {
            return (
                <div className="wrap">
                    <form onSubmit={this.handleSubmit}>
                        <p>
                            <label>
                                <strong>Data source</strong>
                            </label>
                            <br/>
                            <i>Enter a valid JSON api url.</i>
                        </p>
                        <input type="text" style={{width: '100%'}} value={url} onChange={this.urlChange}/>
                        <p><input type="submit" className="button button-primary" value="Submit"/></p>
                    </form>
                    <InputFields {...this.state} />
                </div>
            );
        }
    }
}

//========================================================

function InputFields(props) {
    return (
        <div>
            <input type="hidden" name="mod_json_render_url" value={props.url}/>
            <input type="hidden" name="mod_json_render_fieldmap" value={JSON.stringify(props.fieldMap)}/>
        </div>
    );
}

//========================================================

function Summary(props) {
    return (
        <div>
            <ul>
                <li style={{wordBreak: 'break-all'}}>Data source: {props.url}</li>
                <li>Title: {props.fieldMap.title}</li>
                <li>Content: {props.fieldMap.content}</li>
            </ul>
        </div>
    );
}

//========================================================

class FieldSelection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            items: []
        };

        this.updateFieldMap = this.updateFieldMap.bind(this);
    }

    updateFieldMap(value) {
        this.props.updateFieldMap(value);
    }

    // TODO flytta till egen class
    getApiData() {
        fetch(this.props.url)
            .then(res => res.json())
            .then(
                (result) => {
                    this.setState({
                        isLoaded: true,
                        items: result
                    });
                },
                (error) => {
                    this.setState({
                        isLoaded: true,
                        error
                    });
                }
            );
    }

    componentDidMount() {
        this.getApiData();
    }

    render() {
        const {error, isLoaded, items} = this.state;
        if (error) {
            return <div>Error: {error.message}</div>;
        } else if (!isLoaded) {
            return <div className="spinner is-active" style={{float: 'none', display: 'block', width: 'auto', height: 'auto', padding: '10px 10px 30px 10px'}}></div>;
        } else {
            return <DataList
                data={items}
                url={this.props.url}
                fieldMap={this.props.fieldMap}
                updateFieldMap={this.updateFieldMap}/>;
        }
    }
}

//========================================================

function ListItem(props) {
    const {value, children, fieldMap, object, onClickTitle, onClickContent, onClickContainer} = props;
    return (<li>
        {fieldMap.title === object ? <strong>Title: </strong> : ''}
        {fieldMap.content === object ? <strong>Content: </strong> : ''}
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
        {children ? <ul style={{paddingLeft: 15, borderLeft: '2px solid #ccc'}}>{children}</ul> : ''}
    </li>);
}

//========================================================

import recursiveIterator from 'recursive-iterator';
import objectPath from 'object-path';

class DataList extends Component {
    constructor(props) {
        super(props);
        this.renderNodes = this.renderNodes.bind(this);
        this.setFieldMap = this.setFieldMap.bind(this);
    }

    setFieldMap(path, event) {
        event.preventDefault();
        this.props.updateFieldMap({[event.target.dataset.field]: path});
    }

    renderNodes(data) {
        return Object.keys(data).map(item => {
            if (item === 'objectPath') {
                return;
            }

            let child = <ListItem key={item.toString()}
                                  value={item}
                                  object={data[item]}
                                  fieldMap={this.props.fieldMap}
                                  onClickContainer={e => this.setFieldMap(data[item].objectPath, e)}
                                  onClickTitle={e => this.setFieldMap(data[item], e)}
                                  onClickContent={e => this.setFieldMap(data[item], e)}/>;

            if (typeof data[item] === 'object' && data[item] !== null) {
                child = React.cloneElement(child, {
                    children: Array.isArray(data[item]) ? this.renderNodes(data[item][0]) : this.renderNodes(data[item])
                });
            }

            return child;
        });
    }

    render() {
        const fieldMap = this.props.fieldMap;

        let data = this.props.data;
        if (Array.isArray(data)) {
            fieldMap.itemContainer = '';
        }

        if (fieldMap.itemContainer === null) {
            if (Array.isArray(data)) {
                data = data[0];
            }

            for (let {parent, node, key, path} of new recursiveIterator(data)) {
                if (typeof node === 'object' && node !== null) {
                    let pathString = path.join('.');
                    objectPath.set(data, pathString + '.objectPath', pathString);
                }
            }

            return (
                <div>
                    <h3>Select items container</h3>
                    <ul>{this.renderNodes(data)}</ul>
                </div>
            );
        } else {
            let objectData = objectPath.get(this.props.data, fieldMap.itemContainer);

            if (Array.isArray(objectData)) {
                objectData = objectData[0];
            }

            for (let {parent, node, key, path} of new recursiveIterator(objectData)) {
                if (typeof node !== 'object') {
                    let pathString = path.join('.');
                    objectPath.set(objectData, pathString, pathString);
                }
            }

            return (
                <div>
                    <h3>Select title and content fields</h3>
                    <ul>{this.renderNodes(objectData)}</ul>
                </div>
            );
        }
    }
}

//========================================================
