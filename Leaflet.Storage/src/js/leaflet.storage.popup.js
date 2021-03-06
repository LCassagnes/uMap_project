L.S.Popup = L.Popup.extend({

    options: {
        parseTemplate: true
    },

    initialize: function (feature) {
        this.feature = feature;
        this.container = L.DomUtil.create('div', 'storage-popup');
        this.format();
        L.Popup.prototype.initialize.call(this, {}, feature);
        this.setContent(this.container);
    },

    hasFooter: function () {
        return this.feature.hasPopupFooter();
    },

	/*-----------------------------------------------------------------------*/
	/*                                                                       */
	/*     Fonction vide au départ, j'ai ajouté les fonctionnalités pour     */
	/*     qu'elle gère la personnalisation du titre et ses propriétés.      */
	/*     Propriétés inexistantes au départ que j'ai ajouté dans le         */
	/*     fichier leaflet.storage.features.js                               */
	/*                                                                       */
	/*-----------------------------------------------------------------------*/
    renderTitle: function () {
		//var title;
        //if (this.feature.getDisplayName()) {
            //title = L.DomUtil.create('h1', 'popup-title'); // create a h3 title with a class "popup-title"
            //title.innerHTML = L.Util.escapeHTML(this.feature.getDisplayName());

            //return this.styleNode(title, "Title");
        //}
	},

    styleNode: function (node, property) {
            node.style.color = this.feature["get"+property+"Color"]();
            node.style.fontFamily = this.feature["get"+property+"Font"]();
            node.style.fontSize = this.feature["get"+property+"FontSize"]()+"px";
            node.style.fontStyle = this.feature["get"+property+"Style"]();
            node.style.fontWeight = this.feature["get"+property+"Weight"]();
            node.style.textDecoration = this.feature["get"+property+"Decoration"]();

            return node;
    },

    renderBody: function () {
        var template = this.feature.getOption('popupContentTemplate'),
            container = L.DomUtil.create('div', ''),
            content, properties, center;
        if (this.options.parseTemplate) {
            // Include context properties
            properties = this.feature.map.getGeoContext();
            center = this.feature.getCenter();
            properties.lat = center.lat;
            properties.lon = center.lng;
            properties.lng = center.lng;
            if (typeof this.feature.getMeasure !== 'undefined') {
                properties.measure = this.feature.getMeasure();
            }
            properties = L.extend(properties, this.feature.properties);
            // Resolve properties inside description
            properties.description = L.Util.greedyTemplate(this.feature.properties.description || '', properties);
            content = L.Util.greedyTemplate(template, properties);
        }
        content = L.Util.toHTML(content);
        //console.log(content);
        container.innerHTML = content;
        container = this.styleNode(container, "Description");
        var els = container.querySelectorAll('img,iframe');
        for (var i = 0; i < els.length; i++) {
            this.onElementLoaded(els[i]);
        }
        if (!els.length && container.textContent.replace('\n', '') === '') {
            container.innerHTML = '';
            L.DomUtil.add('h1', '', container, this.feature.getDisplayName());
        }
        return container;
    },

    renderFooter: function () {
        if (this.hasFooter()) {
            var footer = L.DomUtil.create('ul', 'storage-popup-footer', this.container),
                previous_li = L.DomUtil.create('li', 'previous', footer),
                zoom_li = L.DomUtil.create('li', 'zoom', footer),
                next_li = L.DomUtil.create('li', 'next', footer),
                next = this.feature.getNext(),
                prev = this.feature.getPrevious();
            if (next) {
                next_li.title = L._('Go to «{feature}»', {feature: next.properties.name});
            }
            if (prev) {
                previous_li.title = L._('Go to «{feature}»', {feature: prev.properties.name});
            }
            zoom_li.title = L._('Zoom to this feature');
            L.DomEvent.on(next_li, 'click', function () {
                if (next) {
                    next.bringToCenter({zoomTo: next.getOption('zoomTo')}, function () {next.view(next.getCenter());});
                }
            });
            L.DomEvent.on(previous_li, 'click', function () {
                if (prev) {
                    prev.bringToCenter({zoomTo: prev.getOption('zoomTo')}, function () {prev.view(prev.getCenter());});
                }
            });
            L.DomEvent.on(zoom_li, 'click', function () {
                this.bringToCenter({zoomTo: this.getOption('zoomTo')});
            }, this.feature);
        }
    },

    format: function () {
        var title = this.renderTitle();
        if (title) {
            styleNode(name, "Title");
            this.container.appendChild(title);
        }
        var body = this.renderBody();
        if (body) {
            L.DomUtil.add('div', 'storage-popup-content', this.container, body);
        }
        this.renderFooter();
    },

    onElementLoaded: function (el) {
        L.DomEvent.on(el, 'load', function () {
            this._updateLayout();
            this._updatePosition();
            this._adjustPan();
        }, this);
    }

});

L.S.Popup.Large = L.S.Popup.extend({
    options: {
        maxWidth: 500,
        className: 'storage-popup-large'
    },

});

L.S.Popup.BaseWithTitle = L.S.Popup.extend({

    renderTitle: function () {
        var title;
        if (this.feature.getDisplayName()) {
            title = L.DomUtil.create('h3', 'popup-title'); // create a h3 title with a class "popup-title"
            title.innerHTML = L.Util.escapeHTML(this.feature.getDisplayName());
        }
        return title;
    }

});

L.S.Popup.Table = L.S.Popup.BaseWithTitle.extend({

    formatRow: function (key, value) {
        if (value.indexOf('http') === 0) {
            value = '<a href="' + value + '" target="_blank">' + value + '</a>';
        }
        return value;
    },

    addRow: function (container, key, value) {
        var tr = L.DomUtil.create('tr', '', container);
        L.DomUtil.add('th', '', tr, key);
        L.DomUtil.add('td', '', tr, this.formatRow(key, value));
    },

    renderBody: function () {
        var table = L.DomUtil.create('table');

        for (var key in this.feature.properties) {
            if (typeof this.feature.properties[key] === 'object' || key === 'name') {
                continue;
            }
            // TODO, manage links (url, mailto, wikipedia...)
            this.addRow(table, key, L.Util.escapeHTML(this.feature.properties[key]).trim());
        }
        return table;
    }

});

L.S.Popup.table = L.S.Popup.Table;  // backward compatibility

L.S.Popup.GeoRSSImage = L.S.Popup.BaseWithTitle.extend({

    options: {
        minWidth: 300,
        maxWidth: 500,
        className: 'storage-popup-large storage-georss-image'
    },

    renderBody: function () {
        var container = L.DomUtil.create('a');
        container.href = this.feature.properties.link;
        container.target = '_blank';
        if (this.feature.properties.img) {
            var img = L.DomUtil.create('img', '', container);
            img.src = this.feature.properties.img;
            // Sadly, we are unable to override this from JS the clean way
            // See https://github.com/Leaflet/Leaflet/commit/61d746818b99d362108545c151a27f09d60960ee#commitcomment-6061847
            img.style.maxWidth = this.options.maxWidth + 'px';
            img.style.maxHeight = this.options.maxWidth + 'px';
            this.onElementLoaded(img);
        }
        return container;
    }

});

L.S.Popup.GeoRSSLink = L.S.Popup.extend({

    options: {
        className: 'storage-georss-link'
    },

    renderBody: function () {
        var title = this.renderTitle(this),
            a = L.DomUtil.add('a');
        a.href = this.feature.properties.link;
        a.target = '_blank';
        a.appendChild(title);
        return a;
    }
});

L.S.Popup.SimplePanel = L.S.Popup.extend({

    allButton: function () {
        var button = L.DomUtil.create('li', '');
        L.DomUtil.create('i', 'storage-icon-16 storage-list', button);
        var label = L.DomUtil.create('span', '', button);
        label.innerHTML = label.title = L._('See all');
        L.DomEvent.on(button, 'click', this.feature.map.openBrowser, this.feature.map);
        return button;
    },

    update: function () {
        L.S.fire('ui:start', {data: {html: this._content}, actions: [this.allButton()]});
    },

    onRemove: function (map) {
        L.S.fire('ui:end');
        L.S.Popup.prototype.onRemove.call(this, map);
    },

    _initLayout: function () {this._container = L.DomUtil.create('span');},
    _updateLayout: function () {},
    _updatePosition: function () {},
    _adjustPan: function () {}
});
