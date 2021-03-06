L.Storage.FeatureMixin = {

    form_id: 'feature_form',
    staticOptions: {},

    initialize: function (map, latlng, options) {
        this.map = map;
        if(typeof options === 'undefined') {
            options = {};
        }
        // DataLayer the marker belongs to
        this.datalayer = options.datalayer || null;
        this.properties = {_storage_options: {}};
        if (options.geojson) {
            this.populate(options.geojson);
        }
        var isDirty = false,
            self = this;
        try {
            Object.defineProperty(this, 'isDirty', {
                get: function () {
                    return isDirty;
                },
                set: function (status) {
                    if (!isDirty && status) {
                        self.fire('isdirty');
                    }
                    isDirty = status;
                    if (self.datalayer) {
                        self.datalayer.isDirty = status;
                    }
                }
            });
        }
        catch (e) {
            // Certainly IE8, which has a limited version of defineProperty
        }
        this.preInit();
        this.addInteractions();
        this.parentClass.prototype.initialize.call(this, latlng, options);
    },

    preInit: function () {},

    isReadOnly: function () {
        return this.datalayer && this.datalayer.isRemoteLayer();
    },

    view: function(latlng) {
        if (this.map.editEnabled) {
            return;
        }
        if (this.properties._storage_options.outlink) {
            var win = window.open(this.properties._storage_options.outlink);
            return;
        }
        if (this.map.slideshow) {
            this.map.slideshow.current = this;
        }
        this.attachPopup();
        this.openPopup(latlng || this.getCenter());
    },

    openPopup: function () {
        if (this.map.editEnabled) {
            return;
        }
        this.parentClass.prototype.openPopup.apply(this, arguments);
    },

    edit: function(e) {
        if(!this.map.editEnabled || this.isReadOnly()) return;
        var container = L.DomUtil.create('div');

        var builder = new L.S.FormBuilder(this, ['datalayer'], {
            callback: function () {this.edit(e);}  // removeLayer step will close the edit panel, let's reopen it
        });
        container.appendChild(builder.build());

		//Rajout des nouvelles propriétés de style dans le tableau des propriétés pour qu'elles soient prises en compte
        var properties = [];
        for (var i in this.properties) {
            if (typeof this.properties[i] === 'object' ||
                ['name', 'description', 'iconsize', 'titlefont', 'titlefontsize','titlecolor', 'titlestyle', 'titleweight', 'titledecoration', 'descriptionfont', 'descriptionfontsize','descriptioncolor', 'descriptionstyle', 'descriptionweight', 'descriptiondecoration'].indexOf(i) !== -1) {continue;} //Deux éléments rajoutés pour la couleur du texte et la police
            properties.push(['properties.' + i, {label: i}]);
        }
        // We always want name and description for now (properties management to come)
        properties.unshift('properties.description');
        properties.unshift('properties.name');
        builder = new L.S.FormBuilder(this, properties,
            {
                id: 'storage-feature-properties',
                callback: this.resetLabel
            }
        );
        container.appendChild(builder.build());
        this.appendEditFieldsets(container);
        var advancedActions = L.DomUtil.createFieldset(container, L._('Advanced actions'));
        this.getAdvancedEditActions(advancedActions);
        L.S.fire('ui:start', {data: {html: container}});
        this.map.editedFeature = this;
        this.bringToCenter(e);
    },

    getAdvancedEditActions: function (container) {
        var deleteLink = L.DomUtil.create('a', 'storage-delete', container);
        deleteLink.href = '#';
        deleteLink.innerHTML = L._('Delete');
        L.DomEvent.on(deleteLink, 'click', function (e) {
            L.DomEvent.stop(e);
            if (this.confirmDelete()) {
                L.S.fire('ui:end');
            }
        }, this);
    },

	//Les rajouts ici se verrons dans le menu de droite
    appendEditFieldsets: function (container) {

        /**********************************************************/
        /*                                                        */ 
        /*   RAJOUT                                               */
        /*   Section de menu spéciale pour le titre de la popup   */
        /*                                                        */ 
        /**********************************************************/
        /*var iconFields = [
            'properties.iconsize'
        ];
        builder = new L.S.FormBuilder(this, iconFields);
        var iconProperties = L.DomUtil.createFieldset(container, L._('Icon properties')); 
        iconProperties.appendChild(builder.build());*/
	
		/**********************************************************/
		/*                                                        */ 
		/*   RAJOUT												  */
		/*   Section de menu spéciale pour le titre de la popup   */
		/*                                                        */ 
		/**********************************************************/
		var titleFields = [
			'properties.titlefont',
            'properties.titlefontsize',
            'properties.titlecolor',
			'properties.titlestyle',
			'properties.titleweight',
			'properties.titledecoration'
		];
		builder = new L.S.FormBuilder(this, titleFields);
		var titleProperties = L.DomUtil.createFieldset(container, L._('Title properties')); 
		titleProperties.appendChild(builder.build());
		
		
		/****************************************************************/
		/*                                                              */ 
		/*   RAJOUT														*/
		/*   Section de menu spéciale pour la description de la popup   */
		/*                                                              */ 
		/****************************************************************/
		var descriptionFields = [
            'properties.descriptionfont',
            'properties.descriptionfontsize',
			'properties.descriptioncolor',
            'properties.descriptionstyle',
            'properties.descriptionweight',
            'properties.descriptiondecoration'

		];
		builder = new L.S.FormBuilder(this, descriptionFields);
		var descriptionProperties = L.DomUtil.createFieldset(container, L._('Description properties')); 
		descriptionProperties.appendChild(builder.build());

		
		/****************************************************************/
		/*                                                              */ 
		/*   Section de menu spéciale pour les options avancées         */
		/*   du marker                                                  */
		/*                                                              */ 		
		/****************************************************************/
        var optionsFields = this.getAdvancedOptions();
        var builder = new L.S.FormBuilder(this, optionsFields, {
            id: 'storage-feature-advanced-properties',
            callback: this._redraw,
            callbackContext: this
        });
		
        var advancedProperties = L.DomUtil.createFieldset(container, L._('Advanced properties'));
        advancedProperties.appendChild(builder.build());
		
		
		/****************************************************************/
		/*                                                              */ 
		/*   Section de menu spéciale pour les templates de popup       */
		/*                                                              */     
		/****************************************************************/
        var popupFields = [
            'options.popupTemplate'
        ];
        builder = new L.S.FormBuilder(this, popupFields);
        var popupFieldset = L.DomUtil.createFieldset(container, L._('Popup options'));
        popupFieldset.appendChild(builder.build());

    },

    endEdit: function () {},

	//Fonction qui récupère le titre de la popup
    getDisplayName: function () {
        return this.properties.name || this.properties.title || this.datalayer.options.name;
    },
	
	//RAJOUT
	//Fonction qui récupère la description mise dans la popup
	getDescription: function () {
        return this.properties.description || this.properties.content || this.datalayer.options.description;
    },
	
    //RAJOUT
    //Fonction qui récupère la police à utiliser pour le titre de la popup
    getDescriptionFont: function () {
        return this.properties.descriptionfont || this.datalayer.options.descriptionfont;
    },

    getDescriptionFontSize: function () {
        return this.properties.descriptionfontsize || this.datalayer.options.descriptionfontsize;
    },
    
    //RAJOUT
    //Fonction qui récupère la couleur à utiliser pour le titre de la popup
    getDescriptionColor: function () {
        return this.properties.descriptioncolor || this.datalayer.options.descriptioncolor;
    },
    
    //RAJOUT
    //Fonction qui récupère le style (italic/normal) à utiliser pour le titre de la popup
    getDescriptionStyle: function () {
        return this.properties.descriptionstyle || this.datalayer.options.descriptionstyle;
    },
    
    //RAJOUT
    //Fonction qui récupère le poids (gras/normal) à utiliser pour le titre de la popup
    getDescriptionWeight: function () {
        return this.properties.descriptionweight || this.datalayer.options.descriptionweight;
    },
    
    //RAJOUT
    //Fonction qui récupère la décoration (souligné/normal) à utiliser pour le titre de la popup
    getDescriptionDecoration: function () {
        return this.properties.descriptiondecoration || this.datalayer.options.titledecoration;
    },
    
	//RAJOUT
	//Fonction qui récupère la police à utiliser pour le titre de la popup
	getTitleFont: function () {
        return this.properties.titlefont || this.datalayer.options.titlefont;
    },

    //RAJOUT
    //Fonction qui récupère la taille de la police à utiliser pour le titre de la popup
    getTitleFontSize: function () {
        return this.properties.titlefontsize || this.datalayer.options.titlefontsize;
    },
	
	//RAJOUT
	//Fonction qui récupère la couleur à utiliser pour le titre de la popup
	getTitleColor: function () {
        return this.properties.titlecolor || this.datalayer.options.titlecolor;
    },
	
	//RAJOUT
	//Fonction qui récupère le style (italic/normal) à utiliser pour le titre de la popup
	getTitleStyle: function () {
		return this.properties.titlestyle || this.datalayer.options.titlestyle;
	},
	
	//RAJOUT
	//Fonction qui récupère le poids (gras/normal) à utiliser pour le titre de la popup
	getTitleWeight: function () {
		return this.properties.titleweight || this.datalayer.options.titleweight;
	},
	
	//RAJOUT
	//Fonction qui récupère la décoration (souligné/normal) à utiliser pour le titre de la popup
	getTitleDecoration: function () {
		return this.properties.titledecoration || this.datalayer.options.titledecoration;
	},
	
	//RAJOUT
	//Fonction qui récupère la couleur à utiliser pour la description de la popup
	getDescriptionColor: function () {
		return this.properties.descriptioncolor || this.datalayer.options.descriptioncolor;
	},

    //RAJOUT
    //Fonction qui récupère la taille du marqueur
    getIconSize: function () {
        return this.properties.iconsize || this.datalayer && this.datalayer.options.iconsize || undefined;
    },

    hasPopupFooter: function () {
        if (L.Browser.ielt9) {
            return false;
        }
        if (this.datalayer.isRemoteLayer() && this.datalayer.options.remoteData.dynamic) {
            return false;
        }
        return this.map.options.displayPopupFooter;
    },

	//Fonction qui récupère le type de template de la popup
    getPopupClass: function () {
        return L.Storage.Popup[this.getOption('popupTemplate')] || L.Storage.Popup;
    },

    attachPopup: function () {
        var Class = this.getPopupClass();
        this.bindPopup(new Class(this));
    },

    confirmDelete: function () {
        if (confirm(L._('Are you sure you want to delete the feature?'))) {
            this.del();
            return true;
        }
        return false;
    },

    del: function () {
        this.isDirty = true;
        this.map.closePopup();
        if (this.datalayer) {
            this.datalayer.removeLayer(this);
            this.disconnectFromDataLayer(this.datalayer);
        }
    },

    connectToDataLayer: function (datalayer) {
        this.datalayer = datalayer;
    },

    disconnectFromDataLayer: function (datalayer) {
        if (this.datalayer === datalayer) {
            this.datalayer = null;
        }
    },

    populate: function (feature) {
        this.properties = L.extend({}, feature.properties);
        this.options.title = feature.properties && feature.properties.name;
        this.properties._storage_options = L.extend({}, this.properties._storage_options);
    },

    changeDataLayer: function(datalayer) {
        if(this.datalayer) {
            this.datalayer.isDirty = true;
            this.datalayer.removeLayer(this);
        }
        datalayer.addLayer(this);
        datalayer.isDirty = true;
        this._redraw();
    },

    getOption: function (option, fallback) {
        var value = fallback || null;
        if (typeof this.staticOptions[option] !== 'undefined') {
            value = this.staticOptions[option];
        }
        else if (L.Util.usableOption(this.properties._storage_options, option)) {
            value = this.properties._storage_options[option];
        }
        else if (this.datalayer && L.Util.usableOption(this.datalayer.options, option)) {
            value = this.datalayer.options[option];
        }
        else {
            value = this.map.getOption(option);
        }
        return value;
    },

    bringToCenter: function (e, callback) {
        var latlng;
        if (e && e.zoomTo) {
            this.map._zoom = e.zoomTo;
        }
        if (e && e.latlng) {
            latlng = e.latlng;
        }
        else {
            latlng = this.getCenter();
        }
        this.map.panTo(latlng);
        if (callback) {
            callback();
        }
    },

    zoomTo: function () {
        this.bringToCenter({zoomTo: this.getOption('zoomTo')});
    },

    getNext: function () {
        return this.datalayer.getNextFeature(this);
    },

    getPrevious: function () {
        return this.datalayer.getPreviousFeature(this);
    },

    cloneProperties: function () {
        var properties = L.extend({}, this.properties);
        properties._storage_options = L.extend({}, properties._storage_options);
        if (Object.keys && Object.keys(properties._storage_options).length === 0) {
            delete properties._storage_options;  // It can make a difference on big data sets
        }
        return properties;
    },

    deleteProperty: function (property) {
        delete this.properties[property];
        this.makeDirty();
    },

    renameProperty: function (from, to) {
        this.properties[to] = this.properties[from];
        this.deleteProperty(from);
    },

    toGeoJSON: function () {
        return {
            type: 'Feature',
            geometry: this.geometry(),
            properties: this.cloneProperties()
        };
    },

    addInteractions: function () {
        this.on('contextmenu editable:vertex:contextmenu', this._showContextMenu, this);
    },

    _showContextMenu: function (e) {
        var pt = this.map.mouseEventToContainerPoint(e.originalEvent);
        e.relatedTarget = this;
        this.map.contextmenu.showAt(pt, e);
    },

    makeDirty: function () {
        this.isDirty = true;
    },

    getMap: function () {
        return this.map;
    },

    getContextMenuItems: function (e) {
        var items = [];
        if (this.map.editEnabled && !this.isReadOnly()) {
            items = items.concat(this.getEditContextMenuItems(e));
        }
        return items;
    },

    getEditContextMenuItems: function () {
        return ['-',
            {
                text: L._('Edit this feature'),
                callback: this.edit,
                context: this,
                iconCls: 'storage-edit'
            },
            {
                text: L._('Edit feature\'s layer'),
                callback: this.datalayer.edit,
                context: this.datalayer,
                iconCls: 'storage-edit'
            },
            {
                text: L._('Delete this feature'),
                callback: this.confirmDelete,
                context: this,
                iconCls: 'storage-delete'
            }
        ];
    },

    showTooltip: function (content) {
        this.tooltip = new L.Tooltip(this.map);
        this.tooltip.updateContent(content);
        this.updateTooltipPosition();
        // zoomanim?
        this.map.on('zoomend', this.updateTooltipPosition, this);
    },

    removeTooltip: function () {
        this.map.off('zoomend', this.updateTooltipPosition, this);
        if (this.tooltip) {
            this.tooltip.dispose();
        }
    },

    updateTooltipPosition: function () {
        if (!this.tooltip) {return;}
        this.tooltip.updatePosition(this.getCenter());
    },

    onRemove: function (map) {
        this.parentClass.prototype.onRemove.call(this, map);
        if (this.map.editedFeature === this) {
            this.endEdit();
            L.Storage.fire('ui:end');
        }
        if (this.tooltip) {
            this.tooltip.dispose();
        }
    },

    resetLabel: function () {
        if (this.label) {
            this.hideLabel();
            delete this.label;
        }
        if (this.getOption('showLabel') && this.properties.name) {
            this.bindLabel(L.Util.escapeHTML(this.properties.name), {noHide: true});
            this.showLabel();
        }
    },

    matchFilter: function (filter, keys) {
        filter = filter.toLowerCase();
        for (var i = 0; i < keys.length; i++) {
            if ((this.properties[keys[i]] || '').toLowerCase().indexOf(filter) !== -1) return true;
        }
        return false;
    }

};

//Marker's features
L.Storage.Marker = L.Marker.extend({
    parentClass: L.Marker,
    includes: [L.Storage.FeatureMixin, L.Mixin.Events],

    preInit: function () {
        this.setIcon(this.getIcon());
    },

    addInteractions: function () {
        L.Storage.FeatureMixin.addInteractions.call(this);
        this.on('dragend', function (e) {
            this.isDirty = true;
            this.edit(e);
        }, this);
        this.on('click', this._onClick);
        if (!this.isReadOnly()) {
            this.on('mouseover', this._enableDragging);
        }
        this.on('mouseout', this._onMouseOut);
        this._popupHandlersAdded = true; // prevent Leaflet from binding event on bindPopup
    },

    _onClick: function(e){
        if(this.map.editEnabled) {
            this.edit(e);
        }
        else {
            this.view(e.latlng);
        }
    },

    _onMouseOut: function () {
        if(this.dragging && this.dragging._draggable && !this.dragging._draggable._moving) {
            // Do not disable if the mouse went out while dragging
            this._disableDragging();
        }
    },

    _enableDragging: function () {
        // TODO: start dragging after 1 second on mouse down
        if(this.map.editEnabled) {
            if (!this.editEnabled()) this.enableEdit();
            // Enabling dragging on the marker override the Draggable._OnDown
            // event, which, as it stopPropagation, refrain the call of
            // _onDown with map-pane element, which is responsible to
            // set the _moved to false, and thus to enable the click.
            // We should find a cleaner way to handle this.
            this.map.dragging._draggable._moved = false;
        }
    },

    _disableDragging: function () {
        if(this.map.editEnabled) {
            if (this.editor && this.editor.drawing) return;  // when creating a new marker, the mouse can trigger the mouseover/mouseout event
                                                             // do not listen to them
            this.disableEdit();
        }
    },

    _redraw: function() {
        if (this.datalayer && this.datalayer.isVisible()) {
            this._initIcon();
            this.update();
        }
    },

    _initIcon: function () {
        this.options.icon = this.getIcon();
        L.Marker.prototype._initIcon.call(this);
        this.resetLabel();
    },

    disconnectFromDataLayer: function (datalayer) {
        this.options.icon.datalayer = null;
        L.Storage.FeatureMixin.disconnectFromDataLayer.call(this, datalayer);
    },

    geometry: function() {
        /* Return a GeoJSON geometry Object */
        var latlng = this.getLatLng();
        return {
            type: 'Point',
            coordinates: [
                latlng.lng,
                latlng.lat
            ]
        };
    },

    _getIconUrl: function (name) {
        if (typeof name === 'undefined') {
            name = 'icon';
        }
        return this.getOption(name + 'Url');
    },

    getIconClass: function () {
        return this.getOption('iconClass');
    },

    getIcon: function () {
        var Class = L.Storage.Icon[this.getIconClass()] || L.Storage.Icon.Default;
        return new Class(this.map, {feature: this});
    },

    getCenter: function () {
        return this._latlng;
    },

    getClassName: function () {
        return 'marker';
    },

    getAdvancedOptions: function () {
        return [
            'properties._storage_options.color',
            'properties.iconsize',
            'properties._storage_options.iconClass',
            'properties._storage_options.iconUrl',
            'properties._storage_options.zoomTo',
            'properties._storage_options.showLabel'
        ];
    },

    appendEditFieldsets: function (container) {
        L.Storage.FeatureMixin.appendEditFieldsets.call(this, container);
        var coordinatesOptions = [
            ['_latlng.lat', {handler: 'FloatInput', label: L._('Latitude')}],
            ['_latlng.lng', {handler: 'FloatInput', label: L._('Longitude')}]
        ];
        var builder = new L.S.FormBuilder(this, coordinatesOptions, {
            callback: function () {
                this._redraw();
                this.bringToCenter();
            },
            callbackContext: this
        });
        var fieldset = L.DomUtil.createFieldset(container, L._('Coordinates'));
        fieldset.appendChild(builder.build());
    },

    bringToCenter: function (e, callback) {
        callback = callback || function (){};  // mandatory for zoomToShowLayer
        if (this.datalayer.isClustered() && !this._icon) {
            this.datalayer.layer.zoomToShowLayer(this, callback);
        } else {
            L.Storage.FeatureMixin.bringToCenter.call(this, e, callback);
        }
    }

});


L.Storage.PathMixin = {

    options: {
        clickable: true,
        magnetize: true,
        magnetPoint: null
    },  // reset path options

    _onClick: function(e){
        this._popupHandlersAdded = true;  // Prevent leaflet from managing event
        if(!this.map.editEnabled) {
            this.view(e.latlng);
        }
    },

    edit: function (e) {
        if(this.map.editEnabled) {
            if (!this.editEnabled()) this.enableEdit();
            L.Storage.FeatureMixin.edit.call(this, e);
        }
    },

    _toggleEditing: function(e) {
        if(this.map.editEnabled) {
            if(this.editEnabled()) {
                this.endEdit();
                L.Storage.fire('ui:end');
            }
            else {
                this.edit(e);
            }
        }
        // FIXME: disable when disabling global edit
        L.DomEvent.stop(e.originalEvent);
    },

    closePopup: function() {
        this.map.closePopup(this._popup);
    },

    styleOptions: [
        'smoothFactor',
        'color',
        'opacity',
        'stroke',
        'weight',
        'fill',
        'fillColor',
        'fillOpacity',
        'dashArray',
        'clickable'
    ],

    _setStyleOptions: function () {
        var option;
        for (var idx in this.styleOptions) {
            option = this.styleOptions[idx];
            this.options[option] = this.getOption(option);
        }
    },

    getAdvancedOptions: function () {
        return [
            'properties._storage_options.color',
            'properties._storage_options.iconsize',
            'properties._storage_options.opacity',
            'properties._storage_options.weight',
            'properties._storage_options.smoothFactor',
            'properties._storage_options.dashArray',
            'properties._storage_options.zoomTo'
        ];
    },

    _updateStyle: function () {
        this._setStyleOptions();
        L.Polyline.prototype._updateStyle.call(this);
        if (!this.options.clickable) {
            this._path.setAttribute('pointer-events', 'stroke');
        } else {
            this._path.removeAttribute('pointer-events');
        }
    },

    _redraw: function () {
        this._updateStyle();
    },

    onAdd: function (map) {
        this._container = null;
        this._setStyleOptions();
        if (this.map._controls.measureControl) {
            this.map._controls.measureControl.handler.on('enabled', this.showMeasureTooltip, this);
            this.map._controls.measureControl.handler.on('disabled', function () {
                this.removeTooltip();
            }, this);
        }
        this.parentClass.prototype.onAdd.call(this, map);
        if (this.editing && this.editing.enabled()) {
            this.editing.addHooks();
        }
    },

    onRemove: function (map) {
        if (this.map._controls.measureControl) {
            this.map._controls.measureControl.handler.off('enabled', this.showMeasureTooltip, this);
        }
        if (this.editing && this.editing.enabled()) {
            this.editing.removeHooks();
        }
        L.S.FeatureMixin.onRemove.call(this, map);
    },

    getCenter: function () {
        return this._latlng || this._latlngs[Math.floor(this._latlngs.length / 2)];
    },

    zoomTo: function () {
        if (this.options.zoomTo) {
            L.S.FeatureMixin.zoomTo.call(this);
        } else {
            this.map.fitBounds(this.getBounds());
        }
    },

    endEdit: function () {
        this.disableEdit();
        L.Storage.FeatureMixin.endEdit.call(this);
    },

    _onMouseOver: function () {
        if (this.map.editEnabled && !this.map.editedFeature) {
            L.Storage.fire('ui:tooltip', {content: L._('Double-click to edit')});
            this.once('mouseout', function () { L.Storage.fire('ui:tooltip:abort');});
        }
    },

    showMeasureTooltip: function () {
        if (this.datalayer.isVisible()) {
            this.showTooltip({text: this.getMeasure()});
        }
    },

    addInteractions: function () {
        L.Storage.FeatureMixin.addInteractions.call(this);
        this.on('dragend', this.edit);
        this.on('click', this._onClick);
        if (!this.isReadOnly()) {
            this.on('dblclick', this._toggleEditing);
        }
        this.on('mouseover', this._onMouseOver);
        this.on('edit', this.makeDirty);
    }

};

L.Storage.Polyline = L.Polyline.extend({
    parentClass: L.Polyline,
    includes: [L.Storage.FeatureMixin, L.Storage.PathMixin, L.Mixin.Events],

    staticOptions: {
        stroke: true,
        fill: false
    },

    geometry: function() {
        /* Return a GeoJSON geometry Object */
        return {
            type: 'LineString',
            coordinates: L.Util.latLngsForGeoJSON(this.getLatLngs())
        };
    },

    getClassName: function () {
        return 'polyline';
    },

    getMeasure: function () {
        var distance = 0, latlng, latlngs = this.getLatLngs(), previous;
        for (var i = 0; i < latlngs.length; i++) {
            latlng = latlngs[i];
            if (previous) {
                distance += latlng.distanceTo(previous);
            }
            previous = latlng;
        }
        return L.GeometryUtil.readableDistance(distance, true);
    },

    getEditContextMenuItems: function (e) {
        var items = L.Storage.FeatureMixin.getEditContextMenuItems.call(this),
            vertexClicked = e.vertex, index;
        items.push({
            text: L._('Transform to polygon'),
            callback: this.toPolygon,
            context: this
        });
        if (this.map.editedFeature && this.map.editedFeature instanceof L.Storage.Polyline && this.map.editedFeature !== this) {
            items.push({
                text: L._('Merge geometry with edited feature'),
                callback: function () {
                    this.mergeInto(this.map.editedFeature);
                    this.map.editedFeature.editor.reset();
                },
                context: this
            });
        }
        if (vertexClicked) {
            index = e.vertex.getIndex();
            if (index !== 0 && index !== this._latlngs.length - 1) {
                items.push({
                    text: L._('Split line'),
                    callback: function () {
                        this.splitAt(index);
                    },
                    context: this
                });
            } else if (index === 0) {
                items.push({
                    text: L._('Continue line (Ctrl-click)'),
                    callback: this.editor.continueBackward,
                    context: this.editor
                });
            } else if (index === e.vertex.getLastIndex()) {
                items.push({
                    text: L._('Continue line (Ctrl-click)'),
                    callback: this.editor.continueForward,
                    context: this.editor
                });
            }
        }
        return items;
    },

    toPolygon: function () {
        var geojson = this.toGeoJSON();
        geojson.geometry.type = 'Polygon';
        geojson.geometry.coordinates = [geojson.geometry.coordinates];
        var polygon = this.datalayer.geojsonToFeatures(geojson);
        polygon.edit();
        this.del();
    },

    getAdvancedEditActions: function (container) {
        L.Storage.FeatureMixin.getAdvancedEditActions.call(this, container);
        var toPolygon = L.DomUtil.create('a', 'storage-to-polygon', container);
        toPolygon.href = '#';
        toPolygon.innerHTML = L._('Transform to polygon');
        L.DomEvent.on(toPolygon, 'click', this.toPolygon, this);
    },

    mergeInto: function (other) {
        if (!other instanceof L.Storage.Polyline) return;
        var otherLatlngs = other.getLatLngs(),
            otherLeft = otherLatlngs[0],
            otherRight = otherLatlngs[otherLatlngs.length - 1],
            thisLatlngs = this.getLatLngs(),
            thisLeft = thisLatlngs[0],
            thisRight = thisLatlngs[thisLatlngs.length - 1],
            l2ldistance = otherLeft.distanceTo(thisLeft),
            l2rdistance = otherLeft.distanceTo(thisRight),
            r2ldistance = otherRight.distanceTo(thisLeft),
            r2rdistance = otherRight.distanceTo(thisRight),
            toMerge;
        if (l2rdistance < Math.min(l2ldistance, r2ldistance, r2rdistance)) {
            toMerge = [thisLatlngs, otherLatlngs];
        } else if (r2ldistance < Math.min(l2ldistance, l2rdistance, r2rdistance)) {
            toMerge = [otherLatlngs, thisLatlngs];
        } else if (r2rdistance < Math.min(l2ldistance, l2rdistance, r2ldistance)) {
            thisLatlngs.reverse();
            toMerge = [otherLatlngs, thisLatlngs];
        } else {
            thisLatlngs.reverse();
            toMerge = [thisLatlngs, otherLatlngs];
        }
        var a = toMerge[0],
            b = toMerge[1],
            p1 = this.map.latLngToContainerPoint(a[a.length - 1]),
            p2 = this.map.latLngToContainerPoint(b[0]),
            tolerance = 5; // px on screen
        if (Math.abs(p1.x - p2.x) <= tolerance && Math.abs(p1.y - p2.y) <= tolerance) {
            a.pop();
        }
        other.setLatLngs(a.concat(b));
        this.del();
    },

    splitAt: function (index) {
        if (index === 0 || index === this._latlngs.length - 1) return;
        var latlngs = this.getLatLngs(),
            thisLatlngs = latlngs.slice(0, index + 1),
            otherLatlngs = latlngs.slice(index);
        var geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: L.Util.latLngsForGeoJSON(otherLatlngs)
            },
            properties: this.cloneProperties()
        };
        this.setLatLngs(thisLatlngs);
        this.isDirty = true;
        if (this.editEnabled()) {
            this.editor.reset();
        }
        var other = this.datalayer.geojsonToFeatures(geojson);
        return other;
    }

});

L.Storage.Polygon = L.Polygon.extend({
    parentClass: L.Polygon,
    includes: [L.Storage.FeatureMixin, L.Storage.PathMixin, L.Mixin.Events],

    geometry: function() {
        // TODO: add test!
        /* Return a GeoJSON geometry Object */
        /* see: https://github.com/CloudMade/Leaflet/issues/1135 */
        /* and: https://github.com/CloudMade/Leaflet/issues/712 */
        var latlngs = this.getLatLngs().slice(0), closingPoint = latlngs[0];
        latlngs.push(closingPoint);  // Artificially create a LinearRing
        var coords = L.Util.latLngsForGeoJSON(latlngs),
            coordinates = [coords];
        if (this._holes) {
            for (var i = 0; i < this._holes.length; i++) {
                coordinates.push(L.Util.latLngsForGeoJSON(this._holes[i]));
            }
        }
        return {
            type: 'Polygon',
            coordinates: coordinates
        };
    },

    getClassName: function () {
        return 'polygon';
    },

    getAdvancedOptions: function () {
        var options = L.Storage.PathMixin.getAdvancedOptions();
        options.push('properties._storage_options.stroke',
            'properties._storage_options.fill',
            'properties._storage_options.fillColor',
            'properties._storage_options.fillOpacity'
        );
        options.push(['properties._storage_options.outlink', {label: L._('outlink'), helpText: L._('Define output link to open a new window on polygon click.'), placeholder: 'http://...'}]);
        options.push(['properties._storage_options.clickable', {handler: 'NullableBoolean', label: L._('Mouse interactions'), helpText: L._('If false, the polygon will act as a part of the underlying map.')}]);
        return options;
    },

    getMeasure: function () {
        var area = L.GeometryUtil.geodesicArea(this.getLatLngs());
        return L.GeometryUtil.readableArea(area, true);
    },

    getCenter: function () {
        var latlngs = this._latlngs,
            len = latlngs.length,
            p1, p2, f, center;

        for (var i = 0, j = len - 1, area = 0, lat = 0, lng = 0; i < len; j = i++) {
            p1 = latlngs[i];
            p2 = latlngs[j];
            f = p1.lat * p2.lng - p2.lat * p1.lng;
            lat += (p1.lat + p2.lat) * f;
            lng += (p1.lng + p2.lng) * f;
            area += f / 2;
        }

        center = area ? new L.LatLng(lat / (6 * area), lng / (6 * area)) : latlngs[0];
        center.area = area;

        return center;
    },

    getEditContextMenuItems: function () {
        var items = L.Storage.FeatureMixin.getEditContextMenuItems.call(this);
        if (!this._holes || !this._holes.length) {
            items.push({
                text: L._('Transform to lines'),
                callback: this.toPolyline,
                context: this
            });
        }
        items.push({
            text: L._('Start a hole here'),
            callback: this.startHole,
            context: this
        });
        return items;
    },

    startHole: function (e) {
        this.enableEdit();
        this.editor.newHole(e.latlng);
    },

    toPolyline: function () {
        var geojson = this.toGeoJSON();
        geojson.geometry.type = 'LineString';
        geojson.geometry.coordinates = geojson.geometry.coordinates[0];
        var polyline = this.datalayer.geojsonToFeatures(geojson);
        polyline.edit();
        this.del();
    },

    getAdvancedEditActions: function (container) {
        L.Storage.FeatureMixin.getAdvancedEditActions.call(this, container);
        var toPolyline = L.DomUtil.create('a', 'storage-to-polyline', container);
        toPolyline.href = '#';
        toPolyline.innerHTML = L._('Transform to lines');
        L.DomEvent.on(toPolyline, 'click', this.toPolyline, this);
    }
});
