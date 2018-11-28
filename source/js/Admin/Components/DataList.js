import ListItem from './ListItem';
import DropArea from './DropArea';
import RecursiveIterator from 'recursive-iterator';
import objectPath from 'object-path';

import HTML5Backend from 'react-dnd-html5-backend';
import {DragDropContext} from 'react-dnd';

class DataList extends React.Component {
    setFieldMap(path, event) {
        event.preventDefault();
        this.props.updateFieldMap({[event.target.dataset.field]: path});
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
                                  onClickContainer={e => this.setFieldMap(data[item].objectPath, e)}
                                  onClickTitle={e => this.setFieldMap(data[item], e)}
                                  onClickContent={e => this.setFieldMap(data[item], e)}
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
        const {translation} = this.props;
        const fieldMap = this.props.fieldMap;

        if (Array.isArray(data)) {
            fieldMap.itemContainer = '';
        }

        if (fieldMap.itemContainer === null) {
            if (Array.isArray(data)) {
                data = data[0];
            }

            for (let {parent, node, key, path} of new RecursiveIterator(data)) {
                if (typeof node === 'object' && node !== null) {
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
                if (typeof node !== 'object') {
                    let pathString = path.join('.');
                    objectPath.set(objectData, pathString, pathString);
                }
            }

            return (
                <div className="grid-container">
                    <div className="grid-item">
                        <h3>{translation.selectTitleContent}</h3>
                        <ul className="json-tree">
                            {this.renderNodes(objectData)}
                        </ul>
                    </div>

                    <div className="grid-item">
                        <div>
                            <h3>Heading</h3>
                            <DropArea id="heading-drop" list={[]}/>
                        </div>
                        <div>
                            <h3>Content</h3>
                            <DropArea id="content-drop" list={[]}/>
                        </div>
                    </div>
                </div>
            );
        }
    }
}

export default DragDropContext(HTML5Backend)(DataList);