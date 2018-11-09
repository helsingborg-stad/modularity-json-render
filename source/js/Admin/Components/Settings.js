import FieldSelection from './FieldSelection';
import InputFields from './InputFields';
import Summary from './Summary';

const initialState = {
    showFieldSelection: false,
    url: '',
    fieldMap: {
        itemContainer: null,
        title: '',
        content: ''
    }
};

class Settings extends React.Component {
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
                        <input type="text" className="url-input" value={url} onChange={this.urlChange}/>
                        <p><input type="submit" className="button button-primary" value="Submit"/></p>
                    </form>
                    <InputFields {...this.state} />
                </div>
            );
        }
    }
}

export default Settings;