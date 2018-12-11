const isDate = date => {
    const newDate = new Date(date);
    return (newDate !== "Invalid Date") && !isNaN(newDate) && newDate > new Date('01/01/1971 00:00');
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