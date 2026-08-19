declare const wpApiSettings: WpApiSettings;

class FetchData {
    public async fetch(id: string): Promise<string> {
        const apiUrl = wpApiSettings.root + `mod-json-render/v1/get/?id=${encodeURIComponent(id)}&html=true`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch data. Status: ${response.status}`);
        }

        const body = await response.json();

        return body;
    }
}

export default FetchData;