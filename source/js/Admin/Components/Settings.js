import FieldSelection from './FieldSelection';
import InputFields from './InputFields';

class Settings extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showFieldSelection: false,
            url: '',
            view: 'accordion',
            isLoaded: false,
            error: null,
            items: [],
            fieldMap: {
                itemContainer: null,
                heading: [],
                content: []
            }
        };
    }

    componentDidMount() {
        this.initOptions();
    }

    initOptions() {
        if (typeof modJsonRender.options !== 'undefined') {
            const options = modJsonRender.options;
            this.setState({
                url: options.url ? options.url : '',
                view: options.view ? options.view : 'accordion',
                fieldMap: options.fieldMap ? JSON.parse(options.fieldMap) : {
                    itemContainer: null,
                    heading: [],
                    content: []
                },
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
        this.setState({error: null, isLoaded: false, showFieldSelection: false, url: '', fieldMap: {itemContainer: null, heading: [], content: []}});
    }

    updateFieldMap(value) {
        const newVal = Object.assign(this.state.fieldMap, value);
        this.setState({fieldMap: newVal});
    }

    setError(error) {
        this.setState({error});
    }

    setLoaded(value) {
        this.setState({isLoaded: value});
    }

    setItems(items) {
        this.setState({items: items});
    }

    render() {
        const {translation} = this.props;
        const {showFieldSelection, url, error, isLoaded, items} = this.state;

        if (showFieldSelection) {
            return (
                <div>
                    <FieldSelection
                        url={url}
                        error={error}
                        setError={this.setError.bind(this)}
                        isLoaded={isLoaded}
                        setLoaded={this.setLoaded.bind(this)}
                        items={items}
                        setItems={this.setItems.bind(this)}
                        fieldMap={this.state.fieldMap}
                        updateFieldMap={this.updateFieldMap.bind(this)}
                        translation={translation}
                    />
                    <InputFields {...this.state} />
                    <p><a href="#" onClick={this.resetOptions.bind(this)}
                          className="button">{translation.resetSettings}</a></p>
                </div>
            );
        } else {
            return (
                <div className="wrap">
                    <form onSubmit={this.handleSubmit.bind(this)}>
                        <p>
                            <label>
                                <strong>API URL</strong>
                            </label>
                            <br/>
                            <i>{translation.validJsonUrl}</i>
                        </p>
                        <input type="text" className="url-input" value={url} onChange={this.urlChange.bind(this)}/>
                        <p><input type="submit" className="button button-primary" value={translation.sendRequest}/></p>
                    </form>
                    <InputFields {...this.state} />
                </div>
            );
        }
    }
}

export default Settings;