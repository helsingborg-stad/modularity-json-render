import DataList from './DataList';
import getApiData from '../../Utilities/getApiData';

class FieldSelection extends React.Component {
	componentDidMount() {
		this.getData();
	}

	getData() {
		const { url, translation } = this.props;
		getApiData(url).then(
			({ result }) => {
				if (!result || Object.keys(result).length === 0) {
					this.props.setError(Error(translation.couldNotFetch));
					this.props.setLoaded(true);
					return;
				}
				this.props.setItems(result);
				this.props.setLoaded(true);
			},
			({ error }) => {
				this.props.setLoaded(true);
				this.props.setError(error);
			},
		);
	}

	updateFieldMap(value) {
		this.props.updateFieldMap(value);
	}

	setView(value) {
		this.props.setView(value);
	}

	render() {
		const { url, view, error, fieldMap, translation, isLoaded, items } = this.props;

		if (error) {
			return (
				<div className="notice notice-error inline">
					<p>{error.message}</p>
				</div>
			);
		} else if (!isLoaded) {
			return <div className="spinner is-active"></div>;
		} else {
			return (
				<DataList
					data={items}
					url={url}
					view={view}
					setView={this.setView.bind(this)}
					fieldMap={fieldMap}
					updateFieldMap={this.updateFieldMap.bind(this)}
					translation={translation}
				/>
			);
		}
	}
}

export default FieldSelection;
