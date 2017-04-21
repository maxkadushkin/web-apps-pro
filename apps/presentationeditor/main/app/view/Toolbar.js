/*
 *
 * (c) Copyright Ascensio System Limited 2010-2017
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at Lubanas st. 125a-25, Riga, Latvia,
 * EU, LV-1021.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
*/
/**
 *  Toolbar.js
 *
 *  Toolbar view
 *
 *  Created by Alexander Yuzhin on 4/16/14
 *  Copyright (c) 2014 Ascensio System SIA. All rights reserved.
 *
 */

define([
    'backbone',
    'text!presentationeditor/main/app/template/Toolbar.template',
    'common/main/lib/collection/Fonts',
    'common/main/lib/component/Button',
    'common/main/lib/component/ComboBox',
    'common/main/lib/component/DataView',
    'common/main/lib/component/ColorPalette',
    'common/main/lib/component/ThemeColorPalette',
    'common/main/lib/component/Menu',
    'common/main/lib/component/DimensionPicker',
    'common/main/lib/component/Window',
    'common/main/lib/component/ComboBoxFonts',
    'common/main/lib/component/ComboDataView'
/** coauthoring begin **/
    ,'common/main/lib/component/SynchronizeTip'
/** coauthoring end **/

], function (Backbone, template) {
    'use strict';

    PE.enumLock = {
        paragraphLock:  'para-lock',
        shapeLock:      'shape-lock',
        slideLock:      'slide-lock',
        slideDeleted:   'slide-deleted',
        noSlides:       'no-slides',
        lostConnect:    'disconnect',
        incIndentLock:   'can-inc-indent',
        decIndentLock:   'can-dec-indent',
        hyperlinkLock:   'can-hyperlink',
        undoLock:        'can-undo',
        redoLock:        'can-redo',
        docPropsLock:   'doc-props-lock',
        themeLock:      'theme-lock',
        menuFileOpen:   'menu-file-open',
        noParagraphSelected:  'no-paragraph',
        noObjectSelected:  'no-object',
        disableOnStart: 'on-start',
        cantPrint:      'cant-print',
        noTextSelected:  'no-text',
        inEquation: 'in-equation'
    };

    var buttonsArray = function (opts) {
    };

    buttonsArray.prototype = new Array;

    buttonsArray.prototype.disable = function (state) {
        this.forEach(function(btn) {
            btn.setDisabled(state);
        });
    };

    buttonsArray.prototype.toggle = function (state, suppress) {
        this.forEach(function(btn) {
            btn.toggle(state, suppress);
        });
    };

    buttonsArray.prototype.pressed = function () {
        return this.some(function(btn) {
            return btn.pressed;
        });
    };

    buttonsArray.prototype.on = function (event, func) {
        this.forEach(function(btn) {
            btn.on.apply(btn, arguments);
        });
    };

    buttonsArray.prototype.contains = function (id) {
        return this.some(function(btn) {
            return btn.id == id;
        });
    };

    PE.Views.Toolbar =  Backbone.View.extend(_.extend((function(){
        var $tabs, $boxTabs;
        var $panels, $marker, $scrollL;
        var lastPanel;
        var isFolded = false;
        var optsFold = {timeout: 2000};

        var config = {};

        function hasTabInvisible() {
            var _left_bound_ = $boxTabs.offset().left,
                _right_bound_ = _left_bound_ + $boxTabs.width();

            var tab = $tabs.first().get(0);
            var rect = tab.getBoundingClientRect();

            if (!(rect.left < _left_bound_)) {
                tab = $tabs.last().get(0);
                rect = tab.getBoundingClientRect();

                if (!(rect.right > _right_bound_))
                    return false;
            }

            return true;
        }

        function isTabActive(tab) {
            var t = $tabs.filter('.active').find('> a');
            return t.length && t.data('tab') == tab;
        }

        function onResize(e) {
            if ( hasTabInvisible() ){
                if ( !$boxTabs.parent().hasClass('short') )
                    $boxTabs.parent().addClass('short');
            } else
            if ( $boxTabs.parent().hasClass('short') ) {
                $boxTabs.parent().removeClass('short');
            }
        }

        function onScrollTabs(opts, e) {
            var sv = $boxTabs.scrollLeft();
            if ( sv || opts == 'right') {
                $boxTabs.animate({scrollLeft: opts == 'left' ? sv - 100 : sv + 100}, 200);
            }
        }

        function collapseToolbar() {
            optsFold.$bar.removeClass('expanded');
        }

        function expandToolbar() {
            clearTimeout(optsFold.timer);

            optsFold.$bar.addClass('expanded');
            optsFold.timer = setTimeout(collapseToolbar, optsFold.timeout);
        }

        function onShowCoveredPanel(state) {
            collapseToolbar();

            if ( state )
                optsFold.$bar.addClass('cover'); else
                optsFold.$bar.removeClass('cover');
        }

        function setFolded(value) {
            isFolded = value;

            if ( isFolded ) {
                if ( !optsFold.$bar ) optsFold.$bar = this.$el.find('.toolbar');
                if ( !optsFold.$box ) optsFold.$box = this.$el.find('.box-controls');

                optsFold.$bar.addClass('folded');
                optsFold.$box.on({
                    mouseleave: function (e) {
                        optsFold.timer = setTimeout(collapseToolbar, optsFold.timeout);
                    },
                    mouseenter: function (e) {
                        clearTimeout(optsFold.timer);
                    }
                });

                // $(document.body).on('focus', 'input, textarea', function(e) {
                // });
                //
                // $(document.body).on('blur', 'input, textarea', function(e) {
                // });
                //
                // Common.NotificationCenter.on({
                //     'modal:show': function(){
                //     },
                //     'modal:close': function(dlg) {
                //     },
                //     'modal:hide': function(dlg) {
                //     },
                //     'dataview:focus': function(e){
                //     },
                //     'dataview:blur': function(e){
                //     },
                //     'menu:show': function(e){
                //     },
                //     'menu:hide': function(e){
                //     },
                //     'edit:complete': _.bind(me.onEditComplete, me)
                // });

            } else {
                clearTimeout(optsFold.timer);
                optsFold.$bar.removeClass('folded');
                optsFold.$box.off();
            }
        }

        return {
            el: '#toolbar',

            // Delegated events for creating new items, and clearing completed ones.
            events: {
                //
            },

            initialize: function () {
                var me = this;

                config.tabs = [
                    { caption: 'File', action: 'file'},
                    { caption: 'Home', action: 'home', extcls: 'canedit'},
                    { caption: 'Insert', action: 'ins', extcls: 'canedit'} ];

                config.$layout = $(_.template(template)(config));

                me.paragraphControls = [];
                me.shapeControls = [];
                me.slideOnlyControls = [];
                me.synchTooltip = undefined;
                me.schemeNames = [
                    me.txtScheme1, me.txtScheme2, me.txtScheme3, me.txtScheme4, me.txtScheme5,
                    me.txtScheme6, me.txtScheme7, me.txtScheme8, me.txtScheme9, me.txtScheme10,
                    me.txtScheme11, me.txtScheme12, me.txtScheme13, me.txtScheme14, me.txtScheme15,
                    me.txtScheme16, me.txtScheme17, me.txtScheme18, me.txtScheme19, me.txtScheme20,
                    me.txtScheme21
                ];
                me._state = {
                    hasCollaborativeChanges: undefined
                };
                me.btnSaveCls = 'btn-save';
                me.btnSaveTip = this.tipSave + Common.Utils.String.platformKey('Ctrl+S');

            /**
             * UI Components
             */
                var _set = PE.enumLock;

                me.btnAddSlide = new Common.UI.Button({
                    id          : 'id-toolbar-button-add-slide',
                    cls         : 'btn-toolbar x-huge icon-top',
                    iconCls     : 'btn-addslide',
                    split       : true,
                    caption     : me.capAddSlide,
                    lock        : [_set.menuFileOpen, _set.slideDeleted, _set.lostConnect, _set.disableOnStart],
                    menu        : true
                });
                me.slideOnlyControls.push(me.btnAddSlide);

                me.btnChangeSlide =  new Common.UI.Button({
                    id          : 'id-toolbar-button-change-slide',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-changeslide',
                    lock        : [_set.menuFileOpen, _set.slideDeleted, _set.slideLock, _set.lostConnect, _set.noSlides, _set.disableOnStart],
                    menu        : true
                });
                me.slideOnlyControls.push(me.btnChangeSlide);

                me.btnPreview = new Common.UI.Button({
                    id          : 'id-toolbar-button-preview',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-preview',
                    lock        : [_set.menuFileOpen, _set.slideDeleted, _set.noSlides, _set.disableOnStart],
                    split       : true,
                    menu        : new Common.UI.Menu({
                        items : [
                            {caption: this.textShowBegin, value: 0},
                            {caption: this.textShowCurrent, value: 1},
                            {caption: '--'},
                            me.mnuShowSettings = new Common.UI.MenuItem({
                                caption: this.textShowSettings,
                                value: 2,
                                lock: [_set.lostConnect]
                            })
                        ]
                    })
                });
                me.slideOnlyControls.push(me.btnPreview);

                me.btnPrint = new Common.UI.Button({
                    id          : 'id-toolbar-btn-print',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-print',
                    lock        : [_set.slideDeleted, _set.noSlides, _set.cantPrint]
                });
                me.paragraphControls.push(me.btnPrint);

                me.btnSave = new Common.UI.Button({
                    id          : 'id-toolbar-btn-save',
                    cls         : 'btn-toolbar',
                    iconCls     : me.btnSaveCls,
                    lock        : [_set.lostConnect]
                });

                me.btnUndo = new Common.UI.Button({
                    id          : 'id-toolbar-btn-undo',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-undo',
                    lock        : [_set.undoLock, _set.slideDeleted, _set.lostConnect, _set.disableOnStart]
                });
                me.slideOnlyControls.push(me.btnUndo);

                me.btnRedo = new Common.UI.Button({
                    id          : 'id-toolbar-btn-redo',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-redo',
                    lock        : [_set.redoLock, _set.slideDeleted, _set.lostConnect, _set.disableOnStart]
                });
                me.slideOnlyControls.push(me.btnRedo);

                me.btnCopy = new Common.UI.Button({
                    id          : 'id-toolbar-btn-copy',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-copy',
                    lock        : [_set.slideDeleted, _set.lostConnect, _set.noSlides, _set.disableOnStart]
                });
                me.slideOnlyControls.push(me.btnCopy);

                me.btnPaste = new Common.UI.Button({
                    id          : 'id-toolbar-btn-paste',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-paste',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides]
                });
                me.paragraphControls.push(me.btnPaste);

                me.cmbFontName = new Common.UI.ComboBoxFonts({
                    cls         : 'input-group-nr',
                    menuCls     : 'scrollable-menu',
                    menuStyle   : 'min-width: 325px;',
                    hint        : me.tipFontName,
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    store       : new Common.Collections.Fonts()
                });
                me.paragraphControls.push(me.cmbFontName);

                me.cmbFontSize = new Common.UI.ComboBox({
                    cls         : 'input-group-nr',
                    menuStyle   : 'min-width: 55px;',
                    hint        : me.tipFontSize,
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    data        : [
                        { value: 8, displayValue: "8" },
                        { value: 9, displayValue: "9" },
                        { value: 10, displayValue: "10" },
                        { value: 11, displayValue: "11" },
                        { value: 12, displayValue: "12" },
                        { value: 14, displayValue: "14" },
                        { value: 16, displayValue: "16" },
                        { value: 18, displayValue: "18" },
                        { value: 20, displayValue: "20" },
                        { value: 22, displayValue: "22" },
                        { value: 24, displayValue: "24" },
                        { value: 26, displayValue: "26" },
                        { value: 28, displayValue: "28" },
                        { value: 36, displayValue: "36" },
                        { value: 48, displayValue: "48" },
                        { value: 72, displayValue: "72" }
                    ]
                });
                me.paragraphControls.push(me.cmbFontSize);

                me.btnBold = new Common.UI.Button({
                    id          : 'id-toolbar-btn-bold',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-bold',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    enableToggle: true
                });
                me.paragraphControls.push(me.btnBold);

                me.btnItalic = new Common.UI.Button({
                    id          : 'id-toolbar-btn-italic',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-italic',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    enableToggle: true
                });
                me.paragraphControls.push(me.btnItalic);

                me.btnUnderline = new Common.UI.Button({
                    id          : 'id-toolbar-btn-underline',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-underline',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    enableToggle: true
                });
                me.paragraphControls.push(me.btnUnderline);

                me.btnStrikeout = new Common.UI.Button({
                    id          : 'id-toolbar-btn-strikeout',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-strikeout',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    enableToggle: true
                });
                me.paragraphControls.push(me.btnStrikeout);

                me.btnSuperscript = new Common.UI.Button({
                    id          : 'id-toolbar-btn-superscript',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-superscript',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock, _set.inEquation],
                    enableToggle: true,
                    toggleGroup : 'superscriptGroup'
                });
                me.paragraphControls.push(me.btnSuperscript);

                me.btnSubscript = new Common.UI.Button({
                    id          : 'id-toolbar-btn-subscript',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-subscript',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock, _set.inEquation],
                    enableToggle: true,
                    toggleGroup : 'superscriptGroup'
                });
                me.paragraphControls.push(me.btnSubscript);

                me.btnFontColor = new Common.UI.Button({
                    id          : 'id-toolbar-btn-fontcolor',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-fontcolor',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noTextSelected, _set.shapeLock],
                    split       : true,
                    menu        : new Common.UI.Menu({
                        items: [
                            { template: _.template('<div id="id-toolbar-menu-fontcolor" style="width: 169px; height: 220px; margin: 10px;"></div>') },
                            { template: _.template('<a id="id-toolbar-menu-new-fontcolor" style="padding-left:12px;">' + me.textNewColor + '</a>') }
                        ]
                    })
                }).on('render:after', function(btn) {
                    var colorVal = $('<div class="btn-color-value-line"></div>');
                    $('button:first-child', btn.cmpEl).append(colorVal);
                    colorVal.css('background-color', btn.currentColor || 'transparent');

                    me.mnuFontColorPicker = new Common.UI.ThemeColorPalette({
                        el: $('#id-toolbar-menu-fontcolor')
                    });
                });
                me.paragraphControls.push(me.btnFontColor);

                me.btnClearStyle = new Common.UI.Button({
                    id          : 'id-toolbar-btn-clearstyle',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-clearstyle',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected]
                });
                me.paragraphControls.push(me.btnClearStyle);

                me.btnCopyStyle = new Common.UI.Button({
                    id          : 'id-toolbar-btn-copystyle',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-copystyle',
                    lock        : [_set.slideDeleted, _set.lostConnect, _set.noSlides, _set.noParagraphSelected, _set.disableOnStart],
                    enableToggle: true
                });
                me.slideOnlyControls.push(me.btnCopyStyle);

                me.btnMarkers = new Common.UI.Button({
                    id          : 'id-toolbar-btn-markers',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-setmarkers',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected],
                    enableToggle: true,
                    toggleGroup : 'markersGroup',
                    split       : true,
                    menu        : true
                });
                me.paragraphControls.push(me.btnMarkers);

                me.btnNumbers = new Common.UI.Button({
                    id          : 'id-toolbar-btn-numbering',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-numbering',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected],
                    enableToggle: true,
                    toggleGroup : 'markersGroup',
                    split       : true,
                    menu        : true
                });
                me.paragraphControls.push(me.btnNumbers);

                var clone = function(source) {
                    var obj = {};
                    for (var prop in source)
                        obj[prop] = (typeof(source[prop])=='object') ? clone(source[prop]) : source[prop];
                    return obj;
                };

                this.mnuMarkersPicker = {
                    conf: {index:0},
                    selectByIndex: function (idx) {
                        this.conf.index = idx;
                    }
                };
                this.mnuNumbersPicker = clone(this.mnuMarkersPicker);

                me.btnHorizontalAlign = new Common.UI.Button({
                    id          : 'id-toolbar-btn-halign',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-align-left',
                    icls        : 'btn-align-left',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected],
                    menu        : new Common.UI.Menu({
                        items: [
                        {
                            caption     : me.textAlignLeft + Common.Utils.String.platformKey('Ctrl+L'),
                            iconCls     : 'mnu-align-left',
                            icls        : 'btn-align-left',
                            checkable   : true,
                            toggleGroup : 'halignGroup',
                            checked     : true,
                            value       : 1
                        },
                        {
                            caption     : me.textAlignCenter + Common.Utils.String.platformKey('Ctrl+E'),
                            iconCls     : 'mnu-align-center',
                            icls        : 'btn-align-center',
                            checkable   : true,
                            toggleGroup : 'halignGroup',
                            value       : 2
                        },
                        {
                            caption     : me.textAlignRight + Common.Utils.String.platformKey('Ctrl+R'),
                            iconCls     : 'mnu-align-right',
                            icls        : 'btn-align-right',
                            checkable   : true,
                            toggleGroup : 'halignGroup',
                            value       : 0
                        },
                        {
                            caption     : me.textAlignJust + Common.Utils.String.platformKey('Ctrl+J'),
                            iconCls     : 'mnu-align-just',
                            icls        : 'btn-align-just',
                            checkable   : true,
                            toggleGroup : 'halignGroup',
                            value       : 3
                        }
                        ]
                    })
                });
                me.paragraphControls.push(me.btnHorizontalAlign);

                me.btnVerticalAlign = new Common.UI.Button({
                    id          : 'id-toolbar-btn-valign',
                    cls         : 'btn-toolbar',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected],
                    iconCls     : 'btn-align-middle',
                    icls        : 'btn-align-middle',
                    menu        : new Common.UI.Menu({
                        items: [
                            {
                                caption     : me.textAlignTop,
                                iconCls     : 'mnu-align-top',
                                icls        : 'btn-align-top',
                                checkable   : true,
                                toggleGroup : 'valignGroup',
                                value       : Asc.c_oAscVAlign.Top
                            },
                            {
                                caption     : me.textAlignMiddle,
                                iconCls     : 'mnu-align-middle',
                                icls        : 'btn-align-middle',
                                checkable   : true,
                                toggleGroup : 'valignGroup',
                                value       : Asc.c_oAscVAlign.Center,
                                checked     : true
                            },
                            {
                                caption     : me.textAlignBottom,
                                iconCls     : 'mnu-align-bottom',
                                icls        : 'btn-align-bottom',
                                checkable   : true,
                                toggleGroup : 'valignGroup',
                                value       : Asc.c_oAscVAlign.Bottom
                            }
                        ]
                    })
                });
                me.paragraphControls.push(me.btnVerticalAlign);

                me.btnDecLeftOffset = new Common.UI.Button({
                    id          : 'id-toolbar-btn-decoffset',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-decoffset',
                    lock        : [_set.decIndentLock, _set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected]
                });
                me.paragraphControls.push(me.btnDecLeftOffset);

                me.btnIncLeftOffset = new Common.UI.Button({
                    id          : 'id-toolbar-btn-incoffset',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-incoffset',
                    lock        : [_set.incIndentLock, _set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected]
                });
                me.paragraphControls.push(me.btnIncLeftOffset);

                me.btnLineSpace = new Common.UI.Button({
                    id          : 'id-toolbar-btn-linespace',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-linespace',
                    lock        : [_set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected],
                    menu        : new Common.UI.Menu({
                        style: 'min-width: 60px;',
                        items: [
                            { caption: '1.0',  value: 1.0,  checkable: true, toggleGroup: 'linesize' },
                            { caption: '1.15', value: 1.15, checkable: true, toggleGroup: 'linesize' },
                            { caption: '1.5',  value: 1.5,  checkable: true, toggleGroup: 'linesize' },
                            { caption: '2.0',  value: 2.0,  checkable: true, toggleGroup: 'linesize' },
                            { caption: '2.5',  value: 2.5,  checkable: true, toggleGroup: 'linesize' },
                            { caption: '3.0',  value: 3.0,  checkable: true, toggleGroup: 'linesize' }
                        ]
                    })
                });
                me.paragraphControls.push(me.btnLineSpace);

                me.btnInsertTable = new Common.UI.Button({
                    id          : 'id-toolbar-btn-inserttable',
                    cls         : 'btn-toolbar x-huge icon-top',
                    iconCls     : 'btn-inserttable',
                    caption     : me.capInsertTable,
                    lock        : [_set.slideDeleted, _set.lostConnect, _set.noSlides, _set.disableOnStart],
                    menu        : new Common.UI.Menu({
                        items: [
                            { template: _.template('<div id="id-toolbar-menu-tablepicker" class="dimension-picker" style="margin: 5px 10px;"></div>') },
                            { caption: me.mniCustomTable, value: 'custom' }
                        ]
                    })
                }).on('render:after', function(btn) {
                    me.mnuTablePicker = new Common.UI.DimensionPicker({
                        el          : $('#id-toolbar-menu-tablepicker'),
                        minRows     : 8,
                        minColumns  : 10,
                        maxRows     : 8,
                        maxColumns  : 10
                    });
                });
                me.slideOnlyControls.push(me.btnInsertTable);

                me.btnInsertChart = new Common.UI.Button({
                    id          : 'id-toolbar-btn-insertchart',
                    cls         : 'btn-toolbar x-huge icon-top',
                    iconCls     : 'btn-insertchart',
                    caption     : me.capInsertChart,
                    lock        : [_set.slideDeleted, _set.lostConnect, _set.noSlides, _set.disableOnStart],
                    menu        : new Common.UI.Menu({
                        style: 'width: 435px;',
                        items: [
                            { template: _.template('<div id="id-toolbar-menu-insertchart" class="menu-insertchart" style="margin: 5px 5px 5px 10px;"></div>') }
                        ]
                    })
                }).on('render:after', function(btn) {
                    me.mnuInsertChartPicker = new Common.UI.DataView({
                        el: $('#id-toolbar-menu-insertchart'),
                        parentMenu: btn.menu,
                        showLast: false,
                        restoreHeight: 421,
                        groups: new Common.UI.DataViewGroupStore([
                            { id: 'menu-chart-group-bar',     caption: me.textColumn, headername: me.textCharts },
                            { id: 'menu-chart-group-line',    caption: me.textLine },
                            { id: 'menu-chart-group-pie',     caption: me.textPie },
                            { id: 'menu-chart-group-hbar',    caption: me.textBar },
                            { id: 'menu-chart-group-area',    caption: me.textArea, inline: true },
                            { id: 'menu-chart-group-scatter', caption: me.textPoint, inline: true },
                            { id: 'menu-chart-group-stock',   caption: me.textStock, inline: true }
                        ]),
                        store: new Common.UI.DataViewStore([
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barNormal,          allowSelected: true, iconCls: 'column-normal', selected: true},
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barStacked,         allowSelected: true, iconCls: 'column-stack'},
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barStackedPer,      allowSelected: true, iconCls: 'column-pstack'},
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barNormal3d,        allowSelected: true, iconCls: 'column-3d-normal'},
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barStacked3d,       allowSelected: true, iconCls: 'column-3d-stack'},
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barStackedPer3d,    allowSelected: true, iconCls: 'column-3d-pstack'},
                            { group: 'menu-chart-group-bar',     type: Asc.c_oAscChartTypeSettings.barNormal3dPerspective,    allowSelected: true, iconCls: 'column-3d-normal-per'},
                            { group: 'menu-chart-group-line',    type: Asc.c_oAscChartTypeSettings.lineNormal,         allowSelected: true, iconCls: 'line-normal'},
                            { group: 'menu-chart-group-line',    type: Asc.c_oAscChartTypeSettings.lineStacked,        allowSelected: true, iconCls: 'line-stack'},
                            { group: 'menu-chart-group-line',    type: Asc.c_oAscChartTypeSettings.lineStackedPer,     allowSelected: true, iconCls: 'line-pstack'},
                            { group: 'menu-chart-group-line',    type: Asc.c_oAscChartTypeSettings.line3d,             allowSelected: true, iconCls: 'line-3d'},
                            { group: 'menu-chart-group-pie',     type: Asc.c_oAscChartTypeSettings.pie,                allowSelected: true, iconCls: 'pie-normal'},
                            { group: 'menu-chart-group-pie',     type: Asc.c_oAscChartTypeSettings.doughnut,           allowSelected: true, iconCls: 'pie-doughnut'},
                            { group: 'menu-chart-group-pie',     type: Asc.c_oAscChartTypeSettings.pie3d,              allowSelected: true, iconCls: 'pie-3d-normal'},
                                { group: 'menu-chart-group-hbar',    type: Asc.c_oAscChartTypeSettings.hBarNormal,         allowSelected: true, iconCls: 'bar-normal'},
                            { group: 'menu-chart-group-hbar',    type: Asc.c_oAscChartTypeSettings.hBarStacked,        allowSelected: true, iconCls: 'bar-stack'},
                            { group: 'menu-chart-group-hbar',    type: Asc.c_oAscChartTypeSettings.hBarStackedPer,     allowSelected: true, iconCls: 'bar-pstack'},
                            { group: 'menu-chart-group-hbar',    type: Asc.c_oAscChartTypeSettings.hBarNormal3d,       allowSelected: true, iconCls: 'bar-3d-normal'},
                            { group: 'menu-chart-group-hbar',    type: Asc.c_oAscChartTypeSettings.hBarStacked3d,      allowSelected: true, iconCls: 'bar-3d-stack'},
                            { group: 'menu-chart-group-hbar',    type: Asc.c_oAscChartTypeSettings.hBarStackedPer3d,   allowSelected: true, iconCls: 'bar-3d-pstack'},
                            { group: 'menu-chart-group-area',    type: Asc.c_oAscChartTypeSettings.areaNormal,         allowSelected: true, iconCls: 'area-normal'},
                            { group: 'menu-chart-group-area',    type: Asc.c_oAscChartTypeSettings.areaStacked,        allowSelected: true, iconCls: 'area-stack'},
                            { group: 'menu-chart-group-area',    type: Asc.c_oAscChartTypeSettings.areaStackedPer,     allowSelected: true, iconCls: 'area-pstack'},
                            { group: 'menu-chart-group-scatter', type: Asc.c_oAscChartTypeSettings.scatter,            allowSelected: true, iconCls: 'point-normal'},
                            { group: 'menu-chart-group-stock',   type: Asc.c_oAscChartTypeSettings.stock,              allowSelected: true, iconCls: 'stock-normal'}
                        ]),
                        itemTemplate: _.template('<div id="<%= id %>" class="item-chartlist <%= iconCls %>"></div>')
                    })
                });

                me.slideOnlyControls.push(me.btnInsertChart);

                me.btnInsertEquation = new Common.UI.Button({
                    id          : 'id-toolbar-btn-insertequation',
                    cls         : 'btn-toolbar x-huge icon-top',
                    iconCls     : 'btn-insertequation',
                    caption     : me.capInsertEquation,
                    lock        : [_set.slideDeleted, _set.lostConnect, _set.noSlides, _set.disableOnStart],
                    split       : true,
                    menu        : new Common.UI.Menu({cls: 'menu-shapes'})
                });
                me.slideOnlyControls.push(this.btnInsertEquation);

                me.btnInsertHyperlink = new Common.UI.Button({
                    id          : 'id-toolbar-btn-inserthyperlink',
                    cls         : 'btn-toolbar x-huge icon-top',
                    iconCls     : 'btn-inserthyperlink',
                    caption     : me.capInsertHyperlink,
                    lock        : [_set.hyperlinkLock, _set.slideDeleted, _set.paragraphLock, _set.lostConnect, _set.noSlides, _set.noParagraphSelected]
                });
                me.paragraphControls.push(me.btnInsertHyperlink);

                me.btnColorSchemas = new Common.UI.Button({
                    id          : 'id-toolbar-btn-colorschemas',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-colorschemas',
                    lock        : [_set.themeLock, _set.slideDeleted, _set.lostConnect, _set.noSlides, _set.disableOnStart],
                    menu        : new Common.UI.Menu({
                        items       : [],
                        maxHeight   : 600,
                        restoreHeight: 600
                        }).on('show:before', function(mnu) {
                            this.scroller = new Common.UI.Scroller({
                                el: $(this.el).find('.dropdown-menu '),
                            useKeyboard: this.enableKeyEvents && !this.handleSelect,
                            minScrollbarLength  : 40,
                            alwaysVisibleY: true
                        });
                        }).on('show:after', function(btn, e) {
                            var mnu = $(this.el).find('.dropdown-menu '),
                                docH = Common.Utils.innerHeight(),
                                menuH = mnu.outerHeight(),
                                top = parseInt(mnu.css('top'));

                            if (menuH > docH) {
                            mnu.css('max-height', (docH - parseInt(mnu.css('padding-top')) - parseInt(mnu.css('padding-bottom'))-5) + 'px');
                            this.scroller.update({minScrollbarLength  : 40});
                        } else if ( mnu.height() < this.options.restoreHeight ) {
                            mnu.css('max-height', (Math.min(docH - parseInt(mnu.css('padding-top')) - parseInt(mnu.css('padding-bottom'))-5, this.options.restoreHeight)) + 'px');
                            menuH = mnu.outerHeight();
                            if (top+menuH > docH) {
                                mnu.css('top', 0);
                            }
                            this.scroller.update({minScrollbarLength  : 40});
                        }
                    })
                });
                me.slideOnlyControls.push(me.btnColorSchemas);

                me.btnHide = new Common.UI.Button({
                    id          : 'id-toolbar-btn-hidebars',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-hidebars',
                    lock        : [_set.menuFileOpen, _set.slideDeleted, _set.disableOnStart],
                    menu        : true
                });
                me.slideOnlyControls.push(me.btnHide);

                this.btnFitPage = {
                    conf: {checked:false},
                    setChecked: function(val) { this.conf.checked = val;},
                    isChecked: function () { return this.conf.checked; }
                };
                this.btnFitWidth = clone(this.btnFitPage);
                this.mnuZoom = {options: {value: 100}};

                me.btnAdvSettings = new Common.UI.Button({
                    id          : 'id-toolbar-btn-settings',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-settings',
                    lock        : [_set.slideDeleted, _set.disableOnStart]
                });
                me.slideOnlyControls.push(me.btnAdvSettings);

                me.btnShapeAlign = new Common.UI.Button({
                    id          : 'id-toolbar-btn-shape-align',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-align-shape',
                    lock        : [_set.slideDeleted, _set.shapeLock, _set.lostConnect, _set.noSlides, _set.noObjectSelected, _set.disableOnStart],
                    menu        : new Common.UI.Menu({
                        items: [
                            {
                                caption : me.textShapeAlignLeft,
                                iconCls : 'mnu-shape-align-left',
                                value   : Asc.c_oAscAlignShapeType.ALIGN_LEFT
                            },
                            {
                                caption : me.textShapeAlignCenter,
                                iconCls : 'mnu-shape-align-center',
                                value   : Asc.c_oAscAlignShapeType.ALIGN_CENTER
                            },
                            {
                                caption : me.textShapeAlignRight,
                                iconCls : 'mnu-shape-align-right',
                                value   : Asc.c_oAscAlignShapeType.ALIGN_RIGHT
                            },
                            {
                                caption : me.textShapeAlignTop,
                                iconCls : 'mnu-shape-align-top',
                                value   : Asc.c_oAscAlignShapeType.ALIGN_TOP
                            },
                            {
                                caption : me.textShapeAlignMiddle,
                                iconCls : 'mnu-shape-align-middle',
                                value   : Asc.c_oAscAlignShapeType.ALIGN_MIDDLE
                            },
                            {
                                caption : me.textShapeAlignBottom,
                                iconCls : 'mnu-shape-align-bottom',
                                value   : Asc.c_oAscAlignShapeType.ALIGN_BOTTOM
                            },
                            {caption: '--' },
                            {
                                caption : me.txtDistribHor,
                                iconCls : 'mnu-distrib-hor',
                                value   : 6
                            },
                            {
                                caption : me.txtDistribVert,
                                iconCls : 'mnu-distrib-vert',
                                value   : 7
                            }
                        ]
                    })
                });
                me.shapeControls.push(me.btnShapeAlign);
                me.slideOnlyControls.push(me.btnShapeAlign);

                me.btnShapeArrange = new Common.UI.Button({
                    id          : 'id-toolbar-btn-shape-arrange',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-arrange-shape',
                    lock        : [_set.slideDeleted, _set.lostConnect, _set.noSlides, _set.noObjectSelected, _set.disableOnStart],
                    menu        : new Common.UI.Menu({
                        items: [
                            {
                                caption : me.textArrangeFront,
                                iconCls : 'mnu-arrange-front',
                                value   : 1
                            },
                            {
                                caption : me.textArrangeBack,
                                iconCls : 'mnu-arrange-back',
                                value   : 2
                            },
                            {
                                caption : me.textArrangeForward,
                                iconCls : 'mnu-arrange-forward',
                                value   : 3
                            },
                            {
                                caption : me.textArrangeBackward,
                                iconCls : 'mnu-arrange-backward',
                                value   : 4
                            },
                            {caption: '--' },
                            me.mnuGroupShapes = new Common.UI.MenuItem({
                                caption: me.txtGroup,
                                iconCls: 'mnu-group',
                                value: 5
                            }),
                            me.mnuUnGroupShapes = new Common.UI.MenuItem({
                                caption: me.txtUngroup,
                                iconCls: 'mnu-ungroup',
                                value: 6
                            })
                        ]
                    })
                });
                me.slideOnlyControls.push(me.btnShapeArrange );

                me.btnSlideSize = new Common.UI.Button({
                    id          : 'id-toolbar-btn-slide-size',
                    cls         : 'btn-toolbar',
                    iconCls     : 'btn-slidesize',
                    lock        : [_set.docPropsLock, _set.slideDeleted, _set.lostConnect, _set.noSlides, _set.disableOnStart],
                    menu        : new Common.UI.Menu({
                        items: [
                            {
                                caption     : me.mniSlideStandard,
                                checkable   : true,
                                toggleGroup : 'slidesize',
                                value       : 0
                            },
                            {
                                caption     : me.mniSlideWide,
                                checkable   : true,
                                toggleGroup : 'slidesize',
                                value       : 1
                            },
                            {caption: '--'},
                            {
                                caption     : me.mniSlideAdvanced,
                                value       : 'advanced'
                            }
                        ]
                    })
                });
                me.slideOnlyControls.push(me.btnSlideSize);

                me.listTheme = new Common.UI.ComboDataView({
                    cls         : 'combo-styles',
                    itemWidth   : 85,
                    enableKeyEvents: true,
                    itemHeight  : 38,
                    hint: this.tipSlideTheme,
                    lock: [_set.lostConnect, _set.noSlides],
                    beforeOpenHandler: function(e) {
                        var cmp = this,
                            menu = cmp.openButton.menu,
                            minMenuColumn = 6;

                        if (menu.cmpEl) {
                            var itemEl = $(cmp.cmpEl.find('.dataview.inner .style').get(0)).parent();
                            var itemMargin = /*parseInt($(itemEl.get(0)).parent().css('margin-right'))*/-1;
                            var itemWidth = itemEl.is(':visible') ? parseInt(itemEl.css('width')) :
                                            (cmp.itemWidth + parseInt(itemEl.css('padding-left')) + parseInt(itemEl.css('padding-right')) +
                                            parseInt(itemEl.css('border-left-width')) + parseInt(itemEl.css('border-right-width')));

                            var minCount        = cmp.menuPicker.store.length >= minMenuColumn ? minMenuColumn : cmp.menuPicker.store.length,
                                columnCount     = Math.min(cmp.menuPicker.store.length, Math.round($('.dataview', $(cmp.fieldPicker.el)).width() / (itemMargin + itemWidth) + 0.5));

                            columnCount = columnCount < minCount ? minCount : columnCount;
                            menu.menuAlignEl = cmp.cmpEl;

                            menu.menuAlign = 'tl-tl';
                            var offset = cmp.cmpEl.width() - cmp.openButton.$el.width() - columnCount * (itemMargin + itemWidth) - 1;
                            menu.setOffset(Math.min(offset, 0));

                            menu.cmpEl.css({
                                'width' : columnCount * (itemWidth + itemMargin),
                                'min-height': cmp.cmpEl.height()
                            });
                        }

                        if (cmp.menuPicker.scroller) {
                            cmp.menuPicker.scroller.update({
                                includePadding: true,
                                suppressScrollX: true
                            });
                        }
                    }
                });

                me.listTheme.fieldPicker.itemTemplate = _.template([
                    '<div class="style" id="<%= id %>">',
                    '<div style="background-image: url(<%= imageUrl %>); width: ' +  me.listTheme.itemWidth + 'px; height: ' + me.listTheme.itemHeight + 'px;"/>',
                    '</div>'
                ].join(''));
                me.listTheme.menuPicker.itemTemplate = _.template([
                    '<div class="style" id="<%= id %>">',
                    '<div style="background-image: url(<%= imageUrl %>); width: ' +  me.listTheme.itemWidth + 'px; height: ' + me.listTheme.itemHeight + 'px;"/>',
                    '</div>'
                ].join(''));

                this.lockControls = [ this.btnAddSlide, this.btnChangeSlide, this.btnSave,
                    this.btnCopy, this.btnPaste, this.btnUndo, this.btnRedo, this.cmbFontName, this.cmbFontSize,
                    this.btnBold, this.btnItalic, this.btnUnderline, this.btnStrikeout, this.btnSuperscript,
                    this.btnSubscript, this.btnFontColor, this.btnClearStyle, this.btnCopyStyle, this.btnMarkers,
                    this.btnNumbers, this.btnDecLeftOffset, this.btnIncLeftOffset, this.btnLineSpace, this.btnHorizontalAlign,
                    this.btnVerticalAlign, this.btnShapeArrange, this.btnShapeAlign, this.btnInsertTable, this.btnInsertChart,
                    this.btnInsertEquation, this.btnInsertHyperlink, this.btnColorSchemas, this.btnSlideSize, this.listTheme, this.mnuShowSettings
                ];

                // Disable all components before load document
                _.each([me.btnSave]
                    .concat(me.paragraphControls),
                    function(cmp) {
                    if (_.isFunction(cmp.setDisabled))
                        cmp.setDisabled(true);
                });
                this.lockToolbar(PE.enumLock.disableOnStart, true, {array: me.slideOnlyControls.concat(me.shapeControls)});

                return this;
            },

            lockToolbar: function (causes, lock, opts) {
                !opts && (opts = {});

                var controls = opts.array || this.lockControls;
                opts.merge && (controls = _.union(this.lockControls, controls));

                function doLock(cmp, cause) {
                    if (_.contains(cmp.options.lock, cause)) {
                        var index = cmp.keepState.indexOf(cause);
                        if (lock) {
                            if (index < 0) {
                                cmp.keepState.push(cause);
                            }
                        } else {
                            if (!(index < 0)) {
                                cmp.keepState.splice(index, 1);
                            }
                        }
                    }
                }

                _.each(controls, function (item) {
                    if (_.isFunction(item.setDisabled)) {
                        !item.keepState && (item.keepState = []);
                        if (opts.clear && opts.clear.length > 0 && item.keepState.length > 0) {
                            item.keepState = _.difference(item.keepState, opts.clear);
                        }

                        _.isArray(causes) ? _.each(causes, function (c) {
                                doLock(item, c)
                            }) : doLock(item, causes);

                        if (!(item.keepState.length > 0)) {
                            item.isDisabled() && item.setDisabled(false);
                        } else {
                            !item.isDisabled() && item.setDisabled(true);
                        }
                    }
                });
            },

            render: function (mode) {
                var me = this;

                /**
                 * Render UI layout
                 */

                this.fireEvent('render:before', [this]);

                me.isCompactView = mode.compactview;
                if ( mode.isEdit ) {
                    me.$el.html(me.rendererComponents(config.$layout));
                } else {
                    config.$layout.find('.canedit').hide();
                    config.$layout.addClass('folded');

                    me.$el.html(config.$layout);
                }

                this.fireEvent('render:after', [this]);

                $boxTabs = me.$el.find('.tabs > ul');
                $tabs = $boxTabs.find('> li');
                $panels = me.$el.find('.box-panels > .panel');
                $tabs.parent().on('click', '.ribtab', function (e) {
                    var tab = $(e.target).data('tab');
                    if (tab == 'file') {
                        me.fireEvent('file:open');
                    } else
                    if ( isTabActive('file') )
                        me.fireEvent('file:close');

                    me.setTab(tab);
                });

                $marker = me.$el.find('.tabs .marker');
                var $scrollR = me.$el.find('.tabs .scroll.right');
                $scrollL = me.$el.find('.tabs .scroll.left');

                $scrollL.on('click', onScrollTabs.bind(this, 'left'));
                $scrollR.on('click', onScrollTabs.bind(this, 'right'));

                Common.NotificationCenter.on({
                    'window:resize': onResize
                });

                if ( me.isCompactView )
                    me.setFolded(true); else
                    me.setTab('home');

                return this;
            },

            rendererComponents: function (html) {
                var $host = $(html);
                var _injectComponent = function (id, cmp) {
                    var $slot = $host.find(id);
                    if ($slot.length) {
                        cmp.rendered ?
                            $slot.append(cmp.$el) : cmp.render($slot);
                    }
                };

                _injectComponent('#slot-field-fontname', this.cmbFontName);
                _injectComponent('#slot-field-fontsize', this.cmbFontSize);
                _injectComponent('#slot-btn-addslide', this.btnAddSlide);
                _injectComponent('#slot-btn-changeslide', this.btnChangeSlide);
                _injectComponent('#slot-btn-preview', this.btnPreview);
                _injectComponent('#slot-btn-print', this.btnPrint);
                _injectComponent('#slot-btn-save', this.btnSave);
                _injectComponent('#slot-btn-undo', this.btnUndo);
                _injectComponent('#slot-btn-redo', this.btnRedo);
                _injectComponent('#slot-btn-copy', this.btnCopy);
                _injectComponent('#slot-btn-paste', this.btnPaste);
                _injectComponent('#slot-btn-bold', this.btnBold);
                _injectComponent('#slot-btn-italic', this.btnItalic);
                _injectComponent('#slot-btn-underline', this.btnUnderline);
                _injectComponent('#slot-btn-strikeout', this.btnStrikeout);
                _injectComponent('#slot-btn-superscript', this.btnSuperscript);
                _injectComponent('#slot-btn-subscript', this.btnSubscript);
                _injectComponent('#slot-btn-fontcolor', this.btnFontColor);
                _injectComponent('#slot-btn-clearstyle', this.btnClearStyle);
                _injectComponent('#slot-btn-copystyle', this.btnCopyStyle);
                _injectComponent('#slot-btn-markers', this.btnMarkers);
                _injectComponent('#slot-btn-numbering', this.btnNumbers);
                _injectComponent('#slot-btn-incoffset', this.btnIncLeftOffset);
                _injectComponent('#slot-btn-decoffset', this.btnDecLeftOffset);
                _injectComponent('#slot-btn-halign', this.btnHorizontalAlign);
                _injectComponent('#slot-btn-valign', this.btnVerticalAlign);
                _injectComponent('#slot-btn-linespace', this.btnLineSpace);
                _injectComponent('#slot-btn-arrange-shape', this.btnShapeArrange);
                _injectComponent('#slot-btn-align-shape', this.btnShapeAlign);
                _injectComponent('#slot-btn-insertequation', this.btnInsertEquation);
                _injectComponent('#slot-btn-insertlink', this.btnInsertHyperlink);
                _injectComponent('#slot-btn-inserttable', this.btnInsertTable);
                _injectComponent('#slot-btn-insertchart', this.btnInsertChart);
                _injectComponent('#slot-btn-colorschemas', this.btnColorSchemas);
                _injectComponent('#slot-btn-slidesize', this.btnSlideSize);
                _injectComponent('#slot-field-styles', this.listTheme);
                _injectComponent('#slot-btn-hidebars', this.btnHide);
                _injectComponent('#slot-btn-settings', this.btnAdvSettings);

                function _injectBtns(opts) {
                    var array = new buttonsArray;
                    var $slots = $host.find(opts.slot);
                    $slots.each(function(index, el) {
                        var button = new Common.UI.Button(opts.btnconfig);
                        button.render( $slots.eq(index) );

                        array.push(button);
                    });

                    return array;
                }

                var me = this;
                me.btnsInsertImage = _injectBtns({
                    slot: '.slot-insertimg',
                    btnconfig: {
                        cls         : 'btn-toolbar x-huge icon-top',
                        iconCls     : 'btn-insertimage',
                        caption     : me.capInsertImage,
                        lock        : [PE.enumLock.slideDeleted, PE.enumLock.lostConnect, PE.enumLock.noSlides, PE.enumLock.disableOnStart],
                        menu        : true
                    }
                });

                me.btnsInsertText = _injectBtns({
                    slot: '.slot-inserttext',
                    btnconfig: {
                        cls         : 'btn-toolbar x-huge icon-top',
                        iconCls     : 'btn-inserttext',
                        caption     : me.capInsertText,
                        lock        : [PE.enumLock.slideDeleted, PE.enumLock.lostConnect, PE.enumLock.noSlides, PE.enumLock.disableOnStart],
                        enableToggle: true,
                        split       : true,
                        menu        : true
                    }
                });

                me.btnsInsertShape = _injectBtns({
                    slot: '.slot-insertshape',
                    btnconfig: {
                        cls         : 'btn-toolbar x-huge icon-top',
                        iconCls     : 'btn-insertshape',
                        caption     : me.capInsertShape,
                        lock        : [PE.enumLock.slideDeleted, PE.enumLock.lostConnect, PE.enumLock.noSlides, PE.enumLock.disableOnStart],
                        enableToggle: true,
                        menu        : true
                    }
                });

                Array.prototype.push.apply(me.slideOnlyControls, me.btnsInsertImage, me.btnsInsertText, me.btnsInsertShape);
                Array.prototype.push.apply(me.lockControls, me.btnsInsertImage, me.btnsInsertText, me.btnsInsertShape);

                return $host;
            },

            onAppReady: function (config) {
                var me = this;
                (new Promise( function(resolve, reject) {
                    resolve();
                })).then(function () {
                    if ( !config.isEdit ) return;

                    me.btnsInsertImage.forEach(function (btn) {
                        btn.updateHint(me.tipInsertImage);
                        btn.setMenu(
                            new Common.UI.Menu({
                                items: [
                                    { caption: me.mniImageFromFile, value: 'file' },
                                    { caption: me.mniImageFromUrl,  value: 'url' }
                                ]
                            }).on('item:click', function (menu, item, e) {
                                me.fireEvent('insert:image', [item.value]);
                            })
                        );
                    });

                    me.btnsInsertText.forEach(function (btn) {
                        btn.updateHint(me.tipInsertText);
                        btn.setMenu(
                            new Common.UI.Menu({
                                items : [
                                    {caption: me.textInsText, value: 'text'},
                                    {caption: me.textInsTextArt, value: 'art',
                                        menu: new Common.UI.Menu({
                                            menuAlign: 'tl-tr',
                                            cls: 'menu-shapes',
                                            items: [
                                                { template: _.template('<div class="view-insert-art" style="width: 239px; margin-left: 5px;"></div>') }
                                            ]
                                        })
                                    }
                                ]
                            }).on('item:click', function (menu, item, e) {
                                if ( item.value == 'text' )
                                    me.fireEvent('insert:text', ['begin']);
                            })
                        );
                        btn.on('click', function (btn, e) {
                            me.fireEvent('insert:text', [btn.pressed?'begin':'end']);
                        });
                    });

                    me.btnsInsertShape.forEach(function (btn) {
                        btn.updateHint(me.tipInsertShape);
                        btn.setMenu(
                            new Common.UI.Menu({
                                cls: 'menu-shapes'
                            }).on('hide:after', function (e) {
                                me.fireEvent('insert:shape', ['menu:hide']);
                            })
                        );
                    });
                });
            },

            createDelayedElements: function () {
                // set hints
                this.btnAddSlide.updateHint(this.tipAddSlide + Common.Utils.String.platformKey('Ctrl+M'));
                this.btnChangeSlide.updateHint(this.tipChangeSlide);
                this.btnPreview.updateHint(this.tipPreview);
                this.btnPrint.updateHint(this.tipPrint + Common.Utils.String.platformKey('Ctrl+P'));
                this.btnSave.updateHint(this.btnSaveTip);
                this.btnUndo.updateHint(this.tipUndo + Common.Utils.String.platformKey('Ctrl+Z'));
                this.btnRedo.updateHint(this.tipRedo + Common.Utils.String.platformKey('Ctrl+Y'));
                this.btnCopy.updateHint(this.tipCopy + Common.Utils.String.platformKey('Ctrl+C'));
                this.btnPaste.updateHint(this.tipPaste + Common.Utils.String.platformKey('Ctrl+V'));
                this.btnBold.updateHint(this.textBold + Common.Utils.String.platformKey('Ctrl+B'));
                this.btnItalic.updateHint(this.textItalic + Common.Utils.String.platformKey('Ctrl+I'));
                this.btnUnderline.updateHint(this.textUnderline + Common.Utils.String.platformKey('Ctrl+U'));
                this.btnStrikeout.updateHint(this.textStrikeout);
                this.btnSuperscript.updateHint(this.textSuperscript);
                this.btnSubscript.updateHint(this.textSubscript);
                this.btnFontColor.updateHint(this.tipFontColor);
                this.btnClearStyle.updateHint(this.tipClearStyle);
                this.btnCopyStyle.updateHint(this.tipCopyStyle + Common.Utils.String.platformKey('Ctrl+Shift+C'));
                this.btnMarkers.updateHint(this.tipMarkers);
                this.btnNumbers.updateHint(this.tipNumbers);
                this.btnHorizontalAlign.updateHint(this.tipHAligh);
                this.btnVerticalAlign.updateHint(this.tipVAligh);
                this.btnDecLeftOffset.updateHint(this.tipDecPrLeft + Common.Utils.String.platformKey('Ctrl+Shift+M'));
                this.btnIncLeftOffset.updateHint(this.tipIncPrLeft);
                this.btnLineSpace.updateHint(this.tipLineSpace);
                this.btnInsertTable.updateHint(this.tipInsertTable);
                this.btnInsertChart.updateHint(this.tipInsertChart);
                this.btnInsertEquation.updateHint(this.tipInsertEquation);
                this.btnInsertHyperlink.updateHint(this.tipInsertHyperlink + Common.Utils.String.platformKey('Ctrl+K'));
                this.btnColorSchemas.updateHint(this.tipColorSchemas);
                this.btnHide.updateHint(this.tipViewSettings);
                this.btnAdvSettings.updateHint(this.tipAdvSettings);
                this.btnShapeAlign.updateHint(this.tipShapeAlign);
                this.btnShapeArrange.updateHint(this.tipShapeArrange);
                this.btnSlideSize.updateHint(this.tipSlideSize);

                // set menus

                var me = this;

                this.btnHide.setMenu(
                    new Common.UI.Menu({
                        cls: 'pull-right',
                        style: 'min-width: 180px;',
                        items: [
                            this.mnuitemCompactToolbar = new Common.UI.MenuItem({
                                caption: this.textCompactView,
                                checkable: true,
                                checked: me.isCompactView
                            }),
                            this.mnuitemHideStatusBar = new Common.UI.MenuItem({
                                caption: this.textHideStatusBar,
                                checkable: true
                            }),
                            this.mnuitemHideRulers = new Common.UI.MenuItem({
                                caption: this.textHideLines,
                                checkable: true
                            }),
                            {caption: '--'},
                            this.btnFitPage = new Common.UI.MenuItem({
                                caption: this.textFitPage,
                                checkable: true,
                                checked: this.btnFitPage.isChecked()
                            }),
                            this.btnFitWidth = new Common.UI.MenuItem({
                                caption: this.textFitWidth,
                                checkable: true,
                                checked: this.btnFitWidth.isChecked()
                            }),
                            this.mnuZoom = new Common.UI.MenuItem({
                                template: _.template([
                                    '<div id="id-toolbar-menu-zoom" class="menu-zoom" style="height: 25px;" ',
                                    '<% if(!_.isUndefined(options.stopPropagation)) { %>',
                                    'data-stopPropagation="true"',
                                    '<% } %>',
                                    '>',
                                    '<label class="title">' + this.textZoom + '</label>',
                                    '<button id="id-menu-zoom-in" type="button" style="float:right; margin: 2px 5px 0 0;" class="btn small btn-toolbar"><i class="icon btn-zoomin"></i></button>',
                                    '<label class="zoom"><%= options.value %>%</label>',
                                    '<button id="id-menu-zoom-out" type="button" style="float:right; margin-top: 2px;" class="btn small btn-toolbar"><i class="icon btn-zoomout"></i></button>',
                                    '</div>'
                                ].join('')),
                                stopPropagation: true,
                                value: this.mnuZoom.options.value
                            })
                        ]
                    })
                );
                if (this.mode.canBrandingExt && this.mode.customization && this.mode.customization.statusBar === false)
                    this.mnuitemHideStatusBar.hide();

                this.mnuZoomOut = new Common.UI.Button({
                    el: $('#id-menu-zoom-out'),
                    cls: 'btn-toolbar'
                });
                this.mnuZoomIn = new Common.UI.Button({
                    el: $('#id-menu-zoom-in'),
                    cls: 'btn-toolbar'
                });

                this.btnMarkers.setMenu(
                    new Common.UI.Menu({
                        items: [
                            {template: _.template('<div id="id-toolbar-menu-markers" class="menu-markers" style="width: 185px; margin: 0 5px;"></div>')}
                        ]
                    })
                );

                this.btnNumbers.setMenu(
                    new Common.UI.Menu({
                        items: [
                            {template: _.template('<div id="id-toolbar-menu-numbering" class="menu-markers" style="width: 330px; margin: 0 5px;"></div>')}
                        ]
                    })
                );

                this.btnAddSlide.setMenu(
                    new Common.UI.Menu({
                        items: [
                            {template: _.template('<div id="id-toolbar-menu-addslide" class="menu-layouts" style="width: 302px; margin: 0 4px;"></div>')}
                        ]
                    })
                );

                this.btnChangeSlide.setMenu(
                    new Common.UI.Menu({
                        items: [
                            {template: _.template('<div id="id-toolbar-menu-changeslide" class="menu-layouts" style="width: 302px; margin: 0 4px;"></div>')}
                        ]
                    })
                );

                // set dataviews

                var _conf = this.mnuMarkersPicker.conf;
                this.mnuMarkersPicker = new Common.UI.DataView({
                    el: $('#id-toolbar-menu-markers'),
                    parentMenu: this.btnMarkers.menu,
                    restoreHeight: 92,
                    allowScrollbar: false,
                    store: new Common.UI.DataViewStore([
                        {offsety: 0, data: {type: 0, subtype: -1}},
                        {offsety: 38, data: {type: 0, subtype: 1}},
                        {offsety: 76, data: {type: 0, subtype: 2}},
                        {offsety: 114, data: {type: 0, subtype: 3}},
                        {offsety: 152, data: {type: 0, subtype: 4}},
                        {offsety: 190, data: {type: 0, subtype: 5}},
                        {offsety: 228, data: {type: 0, subtype: 6}},
                        {offsety: 266, data: {type: 0, subtype: 7}}
                    ]),
                    itemTemplate: _.template('<div id="<%= id %>" class="item-markerlist" style="background-position: 0 -<%= offsety %>px;"></div>')
                });
                _conf && this.mnuMarkersPicker.selectByIndex(_conf.index, true);

                _conf = this.mnuNumbersPicker.conf;
                this.mnuNumbersPicker = new Common.UI.DataView({
                    el: $('#id-toolbar-menu-numbering'),
                    parentMenu: this.btnNumbers.menu,
                    restoreHeight: 164,
                    allowScrollbar: false,
                    store: new Common.UI.DataViewStore([
                        {offsety: 0, data: {type: 1, subtype: -1}},
                        {offsety: 296, data: {type: 1, subtype: 4}},
                        {offsety: 370, data: {type: 1, subtype: 5}},
                        {offsety: 444, data: {type: 1, subtype: 6}},
                        {offsety: 74, data: {type: 1, subtype: 1}},
                        {offsety: 148, data: {type: 1, subtype: 2}},
                        {offsety: 222, data: {type: 1, subtype: 3}},
                        {offsety: 518, data: {type: 1, subtype: 7}}
                    ]),
                    itemTemplate: _.template('<div id="<%= id %>" class="item-numberlist" style="background-position: 0 -<%= offsety %>px;"></div>')
                });
                _conf && this.mnuNumbersPicker.selectByIndex(_conf.index, true);

                this.mnuAddSlidePicker = new Common.UI.DataView({
                    el: $('#id-toolbar-menu-addslide'),
                    parentMenu: this.btnAddSlide.menu,
                    showLast: false,
                    restoreHeight: 300,
                    style: 'max-height: 300px;',
                    store: PE.getCollection('SlideLayouts'),
                    itemTemplate: _.template([
                        '<div class="layout" id="<%= id %>" style="width: <%= itemWidth %>px;">',
                        '<div style="background-image: url(<%= imageUrl %>); width: <%= itemWidth %>px; height: <%= itemHeight %>px;"/>',
                        '<div class="title"><%= title %></div> ',
                        '</div>'
                    ].join(''))
                });
                if (this.btnAddSlide.menu) {
                    this.btnAddSlide.menu.on('show:after', function () {
                        me.onSlidePickerShowAfter(me.mnuAddSlidePicker);
                        me.mnuAddSlidePicker.scroller.update({alwaysVisibleY: true});
                        me.mnuAddSlidePicker.scroller.scrollTop(0);
                    });
                }
                this.mnuAddSlidePicker._needRecalcSlideLayout = true;

                var createDataPicker = function (btn) {
                    me.mnuChangeSlidePicker = new Common.UI.DataView({
                        el: $('#id-toolbar-menu-changeslide'),
                        parentMenu: me.btnChangeSlide.menu,
                        showLast: false,
                        restoreHeight: 300,
                        style: 'max-height: 300px;',
                        store: PE.getCollection('SlideLayouts'),
                        itemTemplate: _.template([
                            '<div class="layout" id="<%= id %>" style="width: <%= itemWidth %>px;">',
                            '<div style="background-image: url(<%= imageUrl %>); width: <%= itemWidth %>px; height: <%= itemHeight %>px;"/>',
                            '<div class="title"><%= title %></div> ',
                            '</div>'
                        ].join(''))
                    });
                    if (me.btnChangeSlide.menu) {
                        me.btnChangeSlide.menu.on('show:after', function () {
                            me.onSlidePickerShowAfter(me.mnuChangeSlidePicker);
                            me.mnuChangeSlidePicker.scroller.update({alwaysVisibleY: true});
                            me.mnuChangeSlidePicker.scroller.scrollTop(0);
                        });
                    }
                    me.mnuChangeSlidePicker._needRecalcSlideLayout = true;
                };
                // btnChangeSlide isn't in compact toolbar mode -> may be rendered after createDelayedElements
                if (this.btnChangeSlide.rendered)
                    createDataPicker(this.btnChangeSlide);
                else
                    this.btnChangeSlide.on('render:after', createDataPicker);

                this.listenTo(PE.getCollection('SlideLayouts'), 'reset', function () {
                    me.mnuAddSlidePicker._needRecalcSlideLayout = true;
                    if (me.mnuChangeSlidePicker)
                        me.mnuChangeSlidePicker._needRecalcSlideLayout = true;
                });

                this.mnuitemHideStatusBar.setChecked(Common.localStorage.getBool('pe-hidden-status'), true);
                this.mnuitemHideRulers.setChecked(Common.localStorage.getItem("pe-hidden-rulers"), true);

//            // Enable none paragraph components
                this.lockToolbar(PE.enumLock.disableOnStart, false, {array: this.slideOnlyControls.concat(this.shapeControls)});

                /** coauthoring begin **/
                this.showSynchTip = !Common.localStorage.getBool('pe-hide-synch');
                this.needShowSynchTip = false;

                if (this.needShowSynchTip) {
                    this.needShowSynchTip = false;
                    this.onCollaborativeChanges();
                }
                /** coauthoring end **/

            },

            setApi: function (api) {
                this.api = api;

                if (this.api) {
                    this.api.asc_registerCallback('asc_onSendThemeColorSchemes', _.bind(this.onSendThemeColorSchemes, this));
                    /** coauthoring begin **/
                    this.api.asc_registerCallback('asc_onCollaborativeChanges', _.bind(this.onCollaborativeChanges, this));
                    this.api.asc_registerCallback('asc_onAuthParticipantsChanged', _.bind(this.onApiUsersChanged, this));
                    this.api.asc_registerCallback('asc_onParticipantsChanged', _.bind(this.onApiUsersChanged, this));
                    /** coauthoring end **/
                }

                return this;
            },

            setMode: function (mode) {
                if (mode.isDisconnected) {
                    this.lockToolbar(PE.enumLock.lostConnect, true);
                }
                this.mode = mode;
                if (!mode.nativeApp) {
                    var nativeBtnGroup = $('.toolbar-group-native');

                    if (nativeBtnGroup) {
                        nativeBtnGroup.hide();
                    }
                }

                if (mode.isDesktopApp)
                    $('.toolbar-group-native').hide();

                this.lockToolbar(PE.enumLock.cantPrint, !mode.canPrint || mode.disableDownload, {array: [this.btnPrint]});
            },

            onSendThemeColorSchemes: function (schemas) {
                var me = this,
                    mnuColorSchema = me.btnColorSchemas.menu;

                if (mnuColorSchema) {
                    if (mnuColorSchema && mnuColorSchema.items.length > 0) {
                        _.each(mnuColorSchema.items, function (item) {
                            item.remove();
                        });
                    }

                    if (mnuColorSchema == null) {
                        mnuColorSchema = new Common.UI.Menu({
                            maxHeight: 600,
                            restoreHeight: 600
                        }).on('render:after', function (mnu) {
                            this.scroller = new Common.UI.Scroller({
                                el: $(this.el).find('.dropdown-menu '),
                                useKeyboard: this.enableKeyEvents && !this.handleSelect,
                                minScrollbarLength: 40
                            });
                        });
                    }
                    mnuColorSchema.items = [];

                    var itemTemplate = _.template([
                        '<a id="<%= id %>" class="<%= options.cls %>" tabindex="-1" type="menuitem">',
                        '<span class="colors">',
                        '<% _.each(options.colors, function(color) { %>',
                        '<span class="color" style="background: <%= color %>;"></span>',
                        '<% }) %>',
                        '</span>',
                        '<span class="text"><%= caption %></span>',
                        '</a>'
                    ].join(''));

                    _.each(schemas, function (schema, index) {
                        var colors = schema.get_colors();//schema.colors;
                        var schemecolors = [];
                        for (var j = 2; j < 7; j++) {
                            var clr = '#' + Common.Utils.ThemeColor.getHexColor(colors[j].get_r(), colors[j].get_g(), colors[j].get_b());
                            schemecolors.push(clr);
                        }

                        if (index == 21) {
                            mnuColorSchema.addItem({
                                caption: '--'
                            });
                        } else {
                            mnuColorSchema.addItem({
                                template: itemTemplate,
                                cls: 'color-schemas-menu',
                                colors: schemecolors,
                                caption: (index < 21) ? (me.schemeNames[index] || schema.get_name()) : schema.get_name(),
                                value: index
                            });
                        }
                    }, this);
                }
            },

            /** coauthoring begin **/
            onCollaborativeChanges: function () {
                if (this._state.hasCollaborativeChanges) return;
                if (!this.btnSave.rendered) {
                    this.needShowSynchTip = true;
                    return;
                }

                var previewPanel = PE.getController('Viewport').getView('DocumentPreview');
                if (previewPanel && previewPanel.isVisible()) {
                    this.needShowSynchTip = true;
                    return;
                }

                this._state.hasCollaborativeChanges = true;
                var iconEl = $('.icon', this.btnSave.cmpEl);
                iconEl.removeClass(this.btnSaveCls);
                iconEl.addClass('btn-synch');
                if (this.showSynchTip) {
                    this.btnSave.updateHint('');
                    if (this.synchTooltip === undefined)
                        this.createSynchTip();

                    this.synchTooltip.show();
                } else {
                    this.btnSave.updateHint(this.tipSynchronize + Common.Utils.String.platformKey('Ctrl+S'));
                }

                this.btnSave.setDisabled(false);
                Common.Gateway.collaborativeChanges();
            },

            createSynchTip: function () {
                this.synchTooltip = new Common.UI.SynchronizeTip({
                    target: $('#id-toolbar-btn-save')
                });
                this.synchTooltip.on('dontshowclick', function () {
                    this.showSynchTip = false;
                    this.synchTooltip.hide();
                    this.btnSave.updateHint(this.tipSynchronize + Common.Utils.String.platformKey('Ctrl+S'));
                    Common.localStorage.setItem("pe-hide-synch", 1);
                }, this);
                this.synchTooltip.on('closeclick', function () {
                    this.synchTooltip.hide();
                    this.btnSave.updateHint(this.tipSynchronize + Common.Utils.String.platformKey('Ctrl+S'));
                }, this);
            },

            synchronizeChanges: function () {
                if (this.btnSave.rendered) {
                    var iconEl = $('.icon', this.btnSave.cmpEl);

                    if (iconEl.hasClass('btn-synch')) {
                        iconEl.removeClass('btn-synch');
                        iconEl.addClass(this.btnSaveCls);
                        if (this.synchTooltip)
                            this.synchTooltip.hide();
                        this.btnSave.updateHint(this.btnSaveTip);
                        this.btnSave.setDisabled(!this.mode.forcesave);
                        this._state.hasCollaborativeChanges = false;
                    }
                }
            },

            onApiUsersChanged: function (users) {
                var editusers = [];
                _.each(users, function (item) {
                    if (!item.asc_getView())
                        editusers.push(item);
                });

                var length = _.size(editusers);
                var cls = (length > 1) ? 'btn-save-coauth' : 'btn-save';
                if (cls !== this.btnSaveCls && this.btnSave.rendered) {
                    this.btnSaveTip = ((length > 1) ? this.tipSaveCoauth : this.tipSave ) + Common.Utils.String.platformKey('Ctrl+S');

                    var iconEl = $('.icon', this.btnSave.cmpEl);
                    if (!iconEl.hasClass('btn-synch')) {
                        iconEl.removeClass(this.btnSaveCls);
                        iconEl.addClass(cls);
                        this.btnSave.updateHint(this.btnSaveTip);
                    }
                    this.btnSaveCls = cls;
                }
            },

            /** coauthoring end **/

            onSlidePickerShowAfter: function (picker) {
                if (!picker._needRecalcSlideLayout) return;

                if (picker.cmpEl && picker.dataViewItems.length > 0) {
                    var dataViewItems = picker.dataViewItems,
                        el = $(dataViewItems[0].el),
                        itemW = el.outerWidth() + parseInt(el.css('margin-left')) + parseInt(el.css('margin-right')),
                        columnCount = Math.floor(picker.cmpEl.width() / itemW),
                        col = 0, maxHeight = 0;

                    for (var i = 0; i < dataViewItems.length; i++) {
                        var div = $(dataViewItems[i].el).find('.title'),
                            height = div.height();

                        if (height > maxHeight)
                            maxHeight = height;
                        else
                            div.css({'height': maxHeight});

                        col++;
                        if (col > columnCount - 1) {
                            col = 0;
                            maxHeight = 0;
                        }
                    }
                    picker._needRecalcSlideLayout = false;
                }
            },

            setTab: function (tab) {
                if ( !tab || !tab.length ) {
                    if ( isFolded ) onShowCoveredPanel(false);
                    else tab = lastPanel;
                }

                if ( tab ) {
                    $tabs.removeClass('active');
                    $panels.removeClass('active');

                    var panel = $panels.filter('[data-tab=' + tab + ']');
                    if (panel.length) {
                        lastPanel = tab;
                        panel.addClass('active');
                    }

                    var $tp = $tabs.find('> a[data-tab=' + tab + ']').parent();
                    if ($tp.length) {
                        $tp.addClass('active');

                        $marker.width($tp.width());

                        if ($scrollL.is(':visible'))
                            $marker.css({left: $tp.position().left + $boxTabs.scrollLeft() - $scrollL.width()});
                        else $marker.css({left: $tp.position().left});
                    }

                    if ( isFolded ) {
                        if ( panel.length )
                            expandToolbar(); else
                            onShowCoveredPanel(true);
                    }
                }
            },

            addTab: function (tab, panel, after) {
                function _get_tab_action(index) {
                    if ( !config.tabs[index] )
                        return _get_tab_action(--index);

                    return config.tabs[index].action;
                }

                var _tplTab = '<li class="ribtab"><a href="#" data-tab="<%= action %>" data-title="<%= caption %>"><%= caption %></a></li>';

                config.tabs[after + 1] = tab;
                var _after_action = _get_tab_action( after );

                var _elements = $tabs || config.$layout.find('.tabs');
                var $target = _elements.find('a[data-tab=' + _after_action + ']');
                if ( $target.length ) {
                    $target.parent().after( _.template(_tplTab)(tab) );

                    if ( panel ) {
                        _elements = $panels || config.$layout.find('.box-panels > .panel');
                        $target = _elements.filter('[data-tab=' + _after_action + ']');

                        if ( $target.length ) {
                            $target.after(panel);
                        }
                    }

                    // synchronize matched elements
                    $tabs && ($tabs = $boxTabs.find('> li'));
                    $panels && ($panels = this.$el.find('.box-panels > .panel'));
                }
            },

            setFolded: function (f) {
                setFolded.call(this, f);
            },

            setExtra: function (place, el) {
                if ( $tabs ) {
                } else {
                    if ( place == 'right' ) {
                        config.$layout.find('.extra.right').html(el);
                    } else
                    if ( place == 'left' ) {
                        config.$layout.find('.extra.left').html(el);
                    }
                }
            },

            isCompact: function () {
                return isFolded;
            },

            updateTextartMenu: function (collection) {
                var me = this;

                me.btnsInsertText.forEach(function (btn) {
                    if ( btn.textartPicker ) {
                        if ( btn.textartPicker.store.size() == collection.size() ) {
                            btn.textartPicker.store.each(function (model, index) {
                                model.set('imageUrl', collection.at(index).get('imageUrl'));
                            });
                        } else {
                            btn.textartPicker.store.reset( collection.models );
                        }
                    } else {
                        btn.textartPicker = new Common.UI.DataView({
                            el: $('.view-insert-art', btn.menu.items[1].$el),
                            store: collection,
                            parentMenu: btn.menu.items[1],
                            showLast: false,
                            itemTemplate: _.template('<div class="item-art"><img src="<%= imageUrl %>" id="<%= id %>" style="width:50px;height:50px;"></div>')
                        });

                        btn.textartPicker.on('item:click', function(picker, item, record, e) {
                            me.fireEvent('insert:textart', [record.get('data')]);

                            if (e.type !== 'click') this.menu.hide();
                        });
                    }
                });
            },

            updateAutoshapeMenu: function (collection) {
                var me = this;
                for (var i = 0; i < collection.size(); i++) {
                    var group = collection.at(i);

                    me.btnsInsertShape.forEach(function (btn, index) {
                        var menuitem = new Common.UI.MenuItem({
                            caption: group.get('groupName'),
                            menu: new Common.UI.Menu({
                                menuAlign: 'tl-tr',
                                items: [
                                    { template: _.template('<div class="shapegroup-' + i + '" class="menu-shape" style="width: ' + (group.get('groupWidth') - 8) + 'px; margin-left: 5px;"></div>') }
                                ]
                            })
                        });

                        btn.menu.addItem(menuitem);

                        (new Common.UI.DataView({
                            el: $('.shapegroup-' + i, menuitem.$el),
                            store: group.get('groupStore'),
                            parentMenu: menuitem.menu,
                            showLast: false,
                            itemTemplate: _.template('<div class="item-shape"><img src="<%= imageUrl %>" id="<%= id %>"></div>')
                        })).on('item:click', function (picker, item, record, e) {
                            if (e.type !== 'click') Common.UI.Menu.Manager.hideAll();
                            me.fireEvent('insert:shape', [record.get('data').shapeType]);
                        });
                    });
                }
            },

            textBold: 'Bold',
            textItalic: 'Italic',
            textUnderline: 'Underline',
            textStrikeout: 'Strikeout',
            textSuperscript: 'Superscript',
            textSubscript: 'Subscript',
            tipFontName: 'Font Name',
            tipFontSize: 'Font Size',
            tipCopy: 'Copy',
            tipPaste: 'Paste',
            tipUndo: 'Undo',
            tipRedo: 'Redo',
            tipPrint: 'Print',
            tipSave: 'Save',
            tipFontColor: 'Font color',
            tipMarkers: 'Bullets',
            tipNumbers: 'Numbering',
            tipBack: 'Back',
            tipClearStyle: 'Clear Style',
            tipCopyStyle: 'Copy Style',
            textTitleError: 'Error',
            tipHAligh: 'Horizontal Align',
            tipVAligh: 'Vertical Align',
            textAlignTop: 'Align text to the top',
            textAlignMiddle: 'Align text to the middle',
            textAlignBottom: 'Align text to the bottom',
            textAlignLeft: 'Left align text',
            textAlignRight: 'Right align text',
            textAlignCenter: 'Center text',
            textAlignJust: 'Justify',
            tipDecPrLeft: 'Decrease Indent',
            tipIncPrLeft: 'Increase Indent',
            tipLineSpace: 'Line Spacing',
            tipInsertTable: 'Insert Table',
            tipInsertImage: 'Insert Picture',
            mniImageFromFile: 'Picture from file',
            mniImageFromUrl: 'Picture from url',
            mniCustomTable: 'Insert Custom Table',
            tipInsertHyperlink: 'Add Hyperlink',
            tipInsertText: 'Insert Text',
            tipInsertShape: 'Insert Autoshape',
            tipPreview: 'Start Slideshow',
            tipAddSlide: 'Add Slide',
            tipShapeAlign: 'Align Shape',
            tipShapeArrange: 'Arrange Shape',
            textShapeAlignLeft: 'Align Left',
            textShapeAlignRight: 'Align Right',
            textShapeAlignCenter: 'Align Center',
            textShapeAlignTop: 'Align Top',
            textShapeAlignBottom: 'Align Bottom',
            textShapeAlignMiddle: 'Align Middle',
            textArrangeFront: 'Bring To Front',
            textArrangeBack: 'Send To Back',
            textArrangeForward: 'Bring Forward',
            textArrangeBackward: 'Send Backward',
            txtGroup: 'Group',
            txtUngroup: 'Ungroup',
            txtDistribHor: 'Distribute Horizontally',
            txtDistribVert: 'Distribute Vertically',
            tipChangeSlide: 'Change Slide Layout',
            textOK: 'OK',
            textCancel: 'Cancel',
            tipColorSchemas: 'Change Color Scheme',
            textNewColor: 'Add New Custom Color',
            mniSlideStandard: 'Standard (4:3)',
            mniSlideWide: 'Widescreen (16:9)',
            mniSlideAdvanced: 'Advanced Settings',
            tipSlideSize: 'Select Slide Size',
            tipViewSettings: 'View Settings',
            tipAdvSettings: 'Advanced Settings',
            textCompactView: 'View Compact Toolbar',
            textHideTitleBar: 'Hide Title Bar',
            textHideStatusBar: 'Hide Status Bar',
            textHideLines: 'Hide Rulers',
            textFitPage: 'Fit to Slide',
            textFitWidth: 'Fit to Width',
            textZoom: 'Zoom',
            tipInsertChart: 'Insert Chart',
            textLine: 'Line',
            textColumn: 'Column',
            textBar: 'Bar',
            textArea: 'Area',
            textPie: 'Pie',
            textPoint: 'XY (Scatter)',
            textStock: 'Stock',
            tipSynchronize: 'The document has been changed by another user. Please click to save your changes and reload the updates.',
            txtScheme1: 'Office',
            txtScheme2: 'Grayscale',
            txtScheme3: 'Apex',
            txtScheme4: 'Aspect',
            txtScheme5: 'Civic',
            txtScheme6: 'Concourse',
            txtScheme7: 'Equity',
            txtScheme8: 'Flow',
            txtScheme9: 'Foundry',
            txtScheme10: 'Median',
            txtScheme11: 'Metro',
            txtScheme12: 'Module',
            txtScheme13: 'Opulent',
            txtScheme14: 'Oriel',
            txtScheme15: 'Origin',
            txtScheme16: 'Paper',
            txtScheme17: 'Solstice',
            txtScheme18: 'Technic',
            txtScheme19: 'Trek',
            txtScheme20: 'Urban',
            txtScheme21: 'Verve',
            tipSlideTheme: 'Slide Theme',
            tipSaveCoauth: 'Save your changes for the other users to see them.',
            textInsText: 'Insert text box',
            textInsTextArt: 'Insert Text Art',
            textShowBegin: 'Show from Beginning',
            textShowCurrent: 'Show from Current slide',
            textShowSettings: 'Show Settings',
            tipInsertEquation: 'Insert Equation',
            textCharts: 'Charts',
            tipChangeChart: 'Change Chart Type',
            capInsertText: 'Text Box',
            capInsertImage: 'Picture',
            capInsertShape: 'Shape',
            capInsertTable: 'Table',
            capInsertChart: 'Chart',
            capInsertHyperlink: 'Hyperlink',
            capInsertEquation: 'Equation',
            capAddSlide: 'Add Slide',
            capTabFile: 'File',
            capTabHome: 'Home',
            capTabInsert: 'Insert'
        }
    }()), PE.Views.Toolbar || {}));
});