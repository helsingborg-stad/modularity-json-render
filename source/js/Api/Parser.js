'use strict';

const $ = jQuery.noConflict();

module.exports = class {
    constructor(authToken, baseUrl)
    {
        if (typeof(authToken) == 'undefined' || !authToken) {
            return;
        }

        this.authToken = authToken;
        this.baseUrl = baseUrl;
        this.rootFolder = this.getRootFolderId();
        this.commonFields = [
            'filename',
            'width',
            'height',
            'media_type',
            'file_mimetype',
            'file_disksize',
            'byline',
            'camera_created',
            'created',
            'unique_media_id',
            'thumbnail_url_ssl'
        ];
    }

    getRootFolderId()
    {
        var root = '';

        this.listFolders().forEach(folder => {
            if (typeof(folder.name) != 'undefined'
                && folder.name == 'Public'
                && typeof(folder.id) != 'undefined') {
                root = folder.id;
            }
        });

        return root;
    }

    listFolders()
    {
        return this.request('get', '/folder', {});
    }

    searchInFolder(searchString, successCallback, mediaCount, mediaOffset)
    {
        this.requestHook('get', '/search', {
            return_values: this.commonFields,
            folder_ids: this.rootFolder,
            media_count: mediaCount,
            media_offset: mediaOffset,
            q: searchString
        }, successCallback);
    }

    getFolder(successCallback, mediaCount, mediaOffset)
    {
        this.requestHook('get', '/search', {
            return_values: this.commonFields,
            folder_ids: this.rootFolder,
            media_count: mediaCount,
            media_offset: mediaOffset

        }, successCallback);
    }

    requestHook(type, path, data = {}, successCallback)
    {
        $.ajax({
            url : this.baseUrl + path,
            type : type,
            headers: {
                'Authorization' : 'CBX-SIMPLE-TOKEN Token=' + this.authToken
            },
            data : data,
            success : function(response, status) {
                successCallback(response)
            },
            error : function(jqXHR, status, error) {
            }
        });
    }

    request(type, path, data = {})
    {
        var result;

        $.ajax({
            async : false,
            url : this.baseUrl + path,
            type : type,
            headers: {
                'Authorization' : 'CBX-SIMPLE-TOKEN Token=' + this.authToken
            },
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
}
