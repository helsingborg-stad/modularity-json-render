const InputFields = ({fieldMap, url}) =>
    <div>
        <input type="hidden" name="mod_json_render_url" value={url}/>
        <input type="hidden" name="mod_json_render_fieldmap" value={JSON.stringify(fieldMap)}/>
    </div>;

export default InputFields;