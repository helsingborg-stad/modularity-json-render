import FieldSelection from './FieldSelection';
import InputFields from './InputFields';
import Summary from './Summary';

class Settings extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showFieldSelection: false,
            url: '',
            fieldMap: {
                itemContainer: null,
                title: '',
                content: ''
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
                fieldMap: options.fieldMap ? JSON.parse(options.fieldMap) : {
                    itemContainer: null,
                    title: '',
                    content: ''
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
        this.setState({showFieldSelection: false, url: '', fieldMap: {itemContainer: null, title: '', content: ''}});
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
                    <p><a href="#" onClick={this.resetOptions.bind(this)} className="button">Reset settings</a></p>
                </div>
            );
        } else if (showFieldSelection) {
            return (
                <div>
                    <FieldSelection url={url} fieldMap={this.state.fieldMap} updateFieldMap={this.updateFieldMap.bind(this)}/>
                    <InputFields {...this.state} />
                    <p><a href="#" onClick={this.resetOptions} className="button">Reset settings</a></p>
                </div>
            );
        } else {
            return (
                <div className="wrap">
                    <form onSubmit={this.handleSubmit.bind(this)}>
                        <p>
                            <label>
                                <strong>Data source</strong>
                            </label>
                            <br/>
                            <i>Enter a valid JSON api url.</i>
                        </p>
                        <input type="text" className="url-input" value={url} onChange={this.urlChange.bind(this)}/>
                        <p><input type="submit" className="button button-primary" value="Submit"/></p>
                    </form>
                    <InputFields {...this.state} />
                </div>
            );
        }
    }
}

export default Settings;