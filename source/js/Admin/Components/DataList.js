import ListItem from './ListItem';
import DropArea from './DropArea';
import ViewOption from './ViewOption';
import RecursiveIterator from 'recursive-iterator';
import objectPath from 'object-path';

import HTML5Backend from 'react-dnd-html5-backend';
import {DragDropContext} from 'react-dnd';

const dropAreas = ['heading', 'content'];

class DataList extends React.Component {
    updateFieldMap(field, value) {
        this.props.updateFieldMap({[field]: value});
    }

    setItemContainer(e, field, value) {
        e.preventDefault();
        this.updateFieldMap(field, value);
    }

    setView(e) {
        console.log(e.target.value);
        this.props.setView(e.target.value);
    }

    renderNodes(data) {
        const originalData = this.props.data;

        return Object.keys(data).map(item => {
            if (item === 'objectPath' || (Array.isArray(data[item]) && this.props.fieldMap.itemContainer !== null)) {
                return;
            }

            let sample = '';
            if (this.props.fieldMap.itemContainer !== null) {
                const containerData = objectPath.get(originalData, this.props.fieldMap.itemContainer);
                sample = objectPath.get(containerData[1], data[item]);
            }

            let child = <ListItem key={item.toString()}
                                  field={item}
                                  value={data[item]}
                                  sample={sample}
                                  fieldMap={this.props.fieldMap}
                                  onClickContainer={e => this.setItemContainer(e, 'itemContainer', data[item].objectPath)}
                                  translation={this.props.translation}/>;

            if (typeof data[item] === 'object' && data[item] !== null) {
                child = React.cloneElement(child, {
                    children: Array.isArray(data[item]) ? this.renderNodes(data[item][0]) : this.renderNodes(data[item])
                });
            }

            return child;
        });
    }

    render() {
        let {data} = Object.assign({}, this.props);
        const {translation, view} = this.props;
        const fieldMap = this.props.fieldMap;

        if (Array.isArray(data)) {
            fieldMap.itemContainer = '';
        }

        if (fieldMap.itemContainer === null) {
            if (Array.isArray(data)) {
                data = data[0];
            }

            for (let {parent, node, key, path} of new RecursiveIterator(data)) {
                if (! (typeof node === 'object' && node !== null)) {
                    let pathString = path.join('.');
                    objectPath.set(data, pathString + '.objectPath', pathString);
                }
            }

            return (
                <div>
                    <h3>{translation.selectItemsContainer}</h3>
                    <ul className="json-tree">
                        {this.renderNodes(data)}
                    </ul>
                </div>
            );
        } else {
            let objectData = objectPath.get(data, fieldMap.itemContainer);

            if (Array.isArray(objectData)) {
                objectData = objectData[0];
            }

            for (let {parent, node, key, path} of new RecursiveIterator(objectData)) {
                if (! (typeof node === 'object' && node !== null)) {
                    let pathString = path.join('.');
                    objectPath.set(objectData, pathString, pathString);
                }
            }

            return (
                <div className="grid-container">
                    <div className="grid-item">
                        <h3>{translation.selectTitleContent}</h3>
                        {this.renderNodes(objectData)}
                    </div>
                    <div className="grid-item">
                        <ViewOption
                            view={view}
                            setView={this.setView.bind(this)}
                        />
                        {dropAreas.map((area) => {
                            return (
                                <div key={area}>
                                    <h3>{area.charAt(0).toUpperCase() + area.slice(1)}</h3>
                                    <DropArea
                                        id={area}
                                        list={fieldMap[area]}
                                        itemsChange={this.updateFieldMap.bind(this)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
    }
}

export default DragDropContext(HTML5Backend)(DataList);