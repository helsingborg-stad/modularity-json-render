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
        const {url, translation} = this.props;
        getApiData(url)
            .then(
                ({result}) => {
                    if (!result || Object.keys(result).length === 0) {
                        this.setState({
                            error: Error(translation.couldNotFetch),
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
        const {url, fieldMap, translation} = this.props;
        const {error, isLoaded, items} = this.state;
        if (error) {
            return <div className="notice notice-error inline"><p>{error.message}</p></div>;
        } else if (!isLoaded) {
            return <div className="spinner is-active"></div>;
        } else {
            return <DataList
                data={items}
                url={url}
                fieldMap={fieldMap}
                updateFieldMap={this.updateFieldMap}
                translation={translation}/>;
        }
    }
}

export default FieldSelection;