const isDate = date => {
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
};

const getDate = date => {
    date = new Date(date);
    return date.toLocaleDateString('sv-SE');
};

const getDateTime = date => {
    const options = {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'};
    date = new Date(date);
    return date.toLocaleString('sv-SE', options);
};

export {isDate, getDate, getDateTime};