function InputFields(props) {
    return (
        <div>
            <input type="hidden" name="mod_json_render_url" value={props.url}/>
            <input type="hidden" name="mod_json_render_fieldmap" value={JSON.stringify(props.fieldMap)}/>
        </div>
    );
}

export default InputFields;