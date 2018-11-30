function dropAreas(view) {
    let dropAreas = [];

    switch(view) {
        case 'accordion':
            dropAreas.push(
                {id: 'heading', limit: 1},
                {id: 'content', limit: null}
            );
            break;
        case 'accordiontable':
            dropAreas.push(
                {id: 'heading', limit: null},
                {id: 'content', limit: null}
            );
            break;
        case 'table':
            dropAreas.push(
                {id: 'heading', limit: null}
            );
            break;
    }

    return dropAreas;
}

export {dropAreas};