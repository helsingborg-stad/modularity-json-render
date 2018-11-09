import DataList from './DataList';
import getApiData from '../../Utilities/getApiData';

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

    getData() {
        const {url} = this.props;
        getApiData(url)
            .then(
                ({result}) => {
                    if (!result || Object.keys(result).length === 0) {
                        this.setState({
                            error: Error('Could not fetch data from URL.'),
                            isLoaded: true
                        });
                        return;
                    }
                    this.setState({isLoaded: true, items: result});
                }, ({error}) => {
                    this.setState({isLoaded: true, error});
                }
            );
    }

    componentDidMount() {
        this.getData();
    }

    render() {
        const {error, isLoaded, items} = this.state;
        if (error) {
            return <div><p>Error: {error.message}</p></div>;
        } else if (!isLoaded) {
            return <div className="spinner is-active"></div>;
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