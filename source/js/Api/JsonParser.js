'use strict';

const $ = jQuery.noConflict();

module.exports = class {
    constructor(apiUrl, fieldMap)
    {

        //Missing valid url
        if (typeof(apiUrl) == 'undefined' || !apiUrl) {
            console.error("No api url is defined, please define one.");
            return;
        }

        //Missing valid field map
        if (typeof(fieldMap) == 'undefined' || !fieldMap) {
            console.error("No fieldmap is defined, please define one.");
            //return;
        }

        //Map local vars to class scope
        this.apiUrl = apiUrl;
        this.fieldMap = fieldMap;
        this.validMarkupKeys = [
            'title',
            'content'
        ];
    }

    request()
    {
        $.ajax({
            url : this.apiUrl
        }).done(function(data){
            successCallback({status: true, data})
        }).fail(function(){
            //globalCallback({status: false, errorMessage: "Could not query the entered API:url."});
        });
        return;
    }

};
