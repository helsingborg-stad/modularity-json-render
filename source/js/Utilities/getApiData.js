function getApiData(url) {
    return fetch(url)
        .then(res => res.json())
        .then(
            (result) => ({result}),
            (error) => ({error})
        );
}

export default getApiData;
