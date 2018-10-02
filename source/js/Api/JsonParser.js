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

    request(data, type, headers)
    {
        var result;

        $.ajax({
            async : false,
            url : this.apiUrl,
            type : type,
            headers: headers,
            data : data,
            success : function(response, status) {
                result = response;
            }.bind(this),
            error : function(jqXHR, status, error) {
                result = jqXHR;
            }
        });

        return result;
    }
};
