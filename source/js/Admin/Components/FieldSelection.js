import DataList from './DataList';

class FieldSelection extends React.Component {
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

    // TODO move to util method
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

export default FieldSelection;