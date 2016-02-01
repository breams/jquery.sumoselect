/*!
 * jquery.sumoselect - v2.1.0
 * http://hemantnegi.github.io/jquery.sumoselect
 * 2014-04-08
 *
 * Copyright 2015 Hemant Negi
 * Email : hemant.frnz@gmail.com
 * Compressor http://refresh-sf.com/
 */

(function ($, window, document, undefined) {

    'namespace sumo';
    $.fn.SumoSelect = function (options) {

        // var is_visible_default = false;
        //$(document).click(function () { is_visible_default = false; });

        // This is the easiest way to have default options.
        var settings = $.extend({
            placeholder: 'Select Here',   // Dont change it here.
            csvDispCount: 3,              // display no. of items in multiselect. 0 to display all.
            captionFormat:'{0} Selected', // format of caption text. you can set your locale.
            floatWidth: 400,              // Screen width of device at which the list is rendered in floating popup fashion.
            forceCustomRendering: false,  // force the custom modal on all devices below floatWidth resolution.
            nativeOnDevice: ['Android', 'BlackBerry', 'iPhone', 'iPad', 'iPod', 'Opera Mini', 'IEMobile', 'Silk'], //
            outputAsCSV: false,           // true to POST data as csv ( false for Html control array ie. deafault select )
            csvSepChar: ',',              // seperation char in csv mode
            okCancelInMulti: false,       //display ok cancel buttons in desktop mode multiselect also.
            triggerChangeCombined: true,  // im multi select mode wether to trigger change event on individual selection or combined selection.
            selectAll: false,             // to display select all button in multiselect mode.|| also select all will not be available on mobile devices.
            selectAlltext: 'Select All'   // the text to display for select all.

        }, options);

        var ret = this.each(function () {
            var selObj = this; // the original select object.
            if (this.sumo || !$(this).is('select')) return; //already initialized

            this.sumo = {
                E: $(selObj),   //the jquery object of original select element.
                is_multi: $(selObj).attr('multiple'),  //if its a mmultiple select
                select: '',
                caption: '',
                placeholder: '',
                optDiv: '',
                CaptionCont: '',
                is_floating: false,
                is_opened: false,
                //backdrop: '',
                mob:false, // if to open device default select
                Pstate: [],

                createElems: function () {
                    var _this = this;
                    _this.E.wrap('<div class="SumoSelect" tabindex="0">');
                    _this.select = _this.E.parent();
                    _this.caption = $('<span></span>');
                    _this.CaptionCont = $('<p class="CaptionCont"><label><i></i></label></p>').addClass('SlectBox').attr('style', _this.E.attr('style')).prepend(_this.caption);
                    _this.select.append(_this.CaptionCont);

                    if(_this.E.attr('disabled'))
                        _this.select.addClass('disabled').removeAttr('tabindex');

                    //if output as csv and is a multiselect.
                    if (settings.outputAsCSV && _this.is_multi && _this.E.attr('name')) {
                        //create a hidden field to store csv value.
                        _this.select.append($('<input class="HEMANT123" type="hidden" />').attr('name', _this.E.attr('name')).val(_this.getSelStr()));

                        // so it can not post the original select.
                        _this.E.removeAttr('name');
                    }

                    //break for mobile rendring.. if forceCustomRendering is false
                    if (_this.isMobile() && !settings.forceCustomRendering) {
                        _this.setNativeMobile();
                        return;
                    }

                    //hide original select
                    _this.E.hide();

                    //## Creating the list...
                    _this.optDiv = $('<div class="optWrapper">');

                    //branch for floating list in low res devices.
                    _this.floatingList();

                    //Creating the markup for the available options
                    ul = $('<ul class="options">');
                    _this.optDiv.append(ul);

                    // Select all functionality
                    if (settings.selectAll) _this.selAll();

                    $(_this.E.children('option')).each(function (i, opt) {       // parsing options to li
                        opt = $(opt);
                        _this.createLi(opt);
                    });

                    //if multiple then add the class multiple and add OK / CANCEL button
                    if (_this.is_multi) _this.multiSelelect();

                    _this.select.append(_this.optDiv);
                    _this.basicEvents();
                    _this.selAllState();
                },

                //## Creates a LI element from a given option and binds events to it
                //## Adds it to UL at a given index (Last by default)
                createLi: function (opt,i) {
                    var _this = this;

                    if(!opt.attr('value'))opt.attr('value',opt.val());

                    li = $('<li data-val="' + opt.val() + '"><label>' + opt.text() + '</label></li>');
                    if (_this.is_multi) li.prepend('<span><i></i></span>');

                    if (opt[0].disabled)
                        li = li.addClass('disabled');

                    _this.onOptClick(li);

                    if (opt[0].selected)
                        li.addClass('selected');

                    if (opt.attr('class'))
                        li.addClass(opt.attr('class'));

                    ul = _this.optDiv.children('ul.options');
                    if (i === undefined)
                        ul.append(li);
                    else
                        ul.children('li').eq(i).before(li);

                    return li;
                },

                //## Returns the selected items as string in a Multiselect.
                getSelStr: function () {
                    // get the pre selected items.
                    sopt = [];
                    this.E.children('option:selected').each(function () { sopt.push($(this).val()); });
                    return sopt.join(settings.csvSepChar);
                },

                //## THOSE OK/CANCEL BUTTONS ON MULTIPLE SELECT.
                multiSelelect: function () {
                    var _this = this;
                    _this.optDiv.addClass('multiple');
                    _this.okbtn = $('<p class="btnOk">OK</p>').click(function () {

                        //if combined change event is set.
                        if (settings.triggerChangeCombined) {

                            //check for a change in the selection.
                            changed = false;
                            if (_this.E.children('option:selected').length != _this.Pstate.length) {
                                changed = true;
                            }
                            else {
                                _this.E.children('option:selected').each(function () {
                                    if (_this.Pstate.indexOf($(this).val()) < 0) changed = true;
                                });
                            }

                            if (changed) {
                                _this.E.trigger('change').trigger('click');
                                _this.setText();
                            }
                        }
                        _this.hideOpts();
                    });
                    _this.cancelBtn = $('<p class="btnCancel">Cancel</p>').click(function () {
                        _this._cnbtn();
                        _this.hideOpts();
                    });
                    _this.optDiv.append($('<div class="MultiControls">').append(_this.okbtn).append(_this.cancelBtn));
                },

                _cnbtn:function(){
                    var _this = this;
                    //remove all selections
                        _this.E.children('option:selected').each(function () { this.selected = false; });
                        _this.optDiv.find('li.selected').removeClass('selected')

                        //restore selections from saved state.
                        for (var i = 0; i < _this.Pstate.length; i++) {
                            _this.E.children('option[value="' + _this.Pstate[i] + '"]')[0].selected = true;
                            _this.optDiv.find('li[data-val="' + _this.Pstate[i] + '"]').addClass('selected');
                        }
                    _this.selAllState();
                },

                selAll:function(){
                    var _this = this;
                    if(!_this.is_multi)return;
                    _this.chkAll = $('<i>');
                    _this.selAll = $('<p class="select-all"><label>' + settings.selectAlltext + '</label></p>').prepend($('<span></span>').append(_this.chkAll));
                    _this.chkAll.on('click',function(){
                        //_this.toggSelAll(!);
                        _this.selAll.toggleClass('selected');
                        _this.optDiv.find('ul.options li').each(function(ix,e){
                            e = $(e);
                            if(_this.selAll.hasClass('selected')){
                                if(!e.hasClass('selected'))e.trigger('click');
                            }
                            else
                                if(e.hasClass('selected'))e.trigger('click');
                        });
                    });

                    _this.optDiv.prepend(_this.selAll);
                },

                selAllState: function () {
                    var _this = this;
                    if (settings.selectAll) {
                        var sc = 0, vc = 0;
                        _this.optDiv.find('ul.options li').each(function (ix, e) {
                            if ($(e).hasClass('selected')) sc++;
                            if (!$(e).hasClass('disabled')) vc++;
                        });
                        //select all checkbox state change.
                        if (sc == vc) _this.selAll.removeClass('partial').addClass('selected');
                        else if (sc == 0) _this.selAll.removeClass('selected partial');
                        else _this.selAll.addClass('partial')//.removeClass('selected');
                    }
                },

                showOpts: function () {
                    var _this = this;
                    if (_this.E.attr('disabled')) return; // if select is disabled then retrun
                    _this.is_opened = true;
                    //_this.backdrop.show();
                    _this.optDiv.addClass('open');
                    _this.CaptionCont.addClass('open');

                    // hide options on click outside.
                    $(document).on('click.sumo', function (e) {
                            if (!_this.select.is(e.target)                  // if the target of the click isn't the container...
                                && _this.select.has(e.target).length === 0){ // ... nor a descendant of the container
//                               if (_this.is_multi && settings.okCancelInMulti)
//                                    _this._cnbtn();
//                                _this.hideOpts();
								if(!_this.is_opened)return;
								_this.hideOpts();
								if (_this.is_multi && settings.okCancelInMulti)_this._cnbtn();
                            }
                    });

                    if (_this.is_floating) {
                        H = _this.optDiv.children('ul').outerHeight() + 2;  // +2 is clear fix
                        if (_this.is_multi) H = H + parseInt(_this.optDiv.css('padding-bottom'));
                        _this.optDiv.css('height', H);
                    }

                    //maintain state when ok/cancel buttons are available.
                    if (_this.is_multi && (_this.is_floating || settings.okCancelInMulti)) {
                        _this.Pstate = [];
                        _this.E.children('option:selected').each(function () { _this.Pstate.push($(this).val()); });
                    }
                },
                hideOpts: function () {
                    var _this = this;
                    _this.is_opened = false;
                    _this.optDiv.removeClass('open').find('ul li.sel').removeClass('sel');
                    _this.CaptionCont.removeClass('open');
                    $(document).off('click.sumo');
                },
                setOnOpen: function () {
                    var _this = this;
                    var li = _this.optDiv.find('ul li').eq(_this.E[0].selectedIndex);
                    li.addClass('sel');
                    _this.showOpts();
                },
                nav: function (up) {
                    var _this = this, c;
                    var sel = _this.optDiv.find('ul li.sel');
                    if (_this.is_opened && sel.length) {
                        if (up)
                            c = sel.prevAll('li:not(.disabled)');
                        else
                            c = sel.nextAll('li:not(.disabled)');
                        if (!c.length)return;
                        sel.removeClass('sel');
                        sel = c.first().addClass('sel');

                        // setting sel item to visible view.
                        var ul = _this.optDiv.find('ul'),
                            st = ul.scrollTop(),
                            t = sel.position().top + st;
                        if(t >= st + ul.height()-sel.outerHeight())
                            ul.scrollTop(t - ul.height() + sel.outerHeight());
                        if(t<st)
                            ul.scrollTop(t);

                    }
                    else
                        _this.setOnOpen();
                },

                basicEvents: function () {
                    var _this = this;
                    _this.CaptionCont.click(function (evt) {
                        _this.E.trigger('click');
                        if (_this.is_opened) _this.hideOpts(); else _this.showOpts();
                        evt.stopPropagation();
                    });

                  /*  _this.select.on('blur focusout', function () {
                        if(!_this.is_opened)return;
                        //_this.hideOpts();
                        _this.hideOpts();

                    if (_this.is_multi && settings.okCancelInMulti)
                         _this._cnbtn();
                    })*/
                        _this.select.on('keydown', function (e) {
                            switch (e.which) {
                                case 38: // up
                                    _this.nav(true);
                                    break;

                                case 40: // down
                                    _this.nav(false);
                                    break;

                                case 32: // space
                                case 13: // enter
                                    if (_this.is_opened)
                                        _this.optDiv.find('ul li.sel').trigger('click');
                                    else
                                        _this.setOnOpen();
                                    break;
								case 9:	 //tab
                                case 27: // esc
                                     if (_this.is_multi && settings.okCancelInMulti)_this._cnbtn();
                                    _this.hideOpts();
                                    return;

                                default:
                                    return; // exit this handler for other keys
                            }
                            e.preventDefault(); // prevent the default action (scroll / move caret)
                        });

                    $(window).on('resize.sumo', function () {
                        _this.floatingList();
                    });
                },

                onOptClick: function (li) {
                    var _this = this;
                    li.click(function () {
                        var li = $(this);
                        if(li.hasClass('disabled'))return;
                        txt = "";
                        if (_this.is_multi) {
                            li.toggleClass('selected');
                            _this.E.children('option[value="' + li.data('val') + '"]')[0].selected = li.hasClass('selected');

                            _this.selAllState();
                        }
                        else {
                            li.parent().find('li.selected').removeClass('selected'); //if not multiselect then remove all selections from this list
                            li.toggleClass('selected');
                            _this.E.val(li.attr('data-val'));   //set the value of select element
                        }

                        //branch for combined change event.
                        if (!(_this.is_multi && settings.triggerChangeCombined && (_this.is_floating || settings.okCancelInMulti))) {
                            _this.setText();
                            _this.E.trigger('change').trigger('click');
                        }

                        if (!_this.is_multi) _this.hideOpts(); //if its not a multiselect then hide on single select.
                    });
                },

                setText: function () {
                    var _this = this;
                    _this.placeholder = "";
                    if (_this.is_multi) {
                        sels = _this.E.children(':selected').not(':disabled'); //selected options.

                        for (var i = 0; i < sels.length; i++) {
                            if (i + 1 >= settings.csvDispCount && settings.csvDispCount) {
                                _this.placeholder = settings.captionFormat.replace('{0}', sels.length);
                                //_this.placeholder = i + '+ Selected';
                                break;
                            }
                            else _this.placeholder += $(sels[i]).text() + ", ";
                        }
                        _this.placeholder = _this.placeholder.replace(/,([^,]*)$/, '$1'); //remove unexpected "," from last.
                    }
                    else {
                        _this.placeholder = _this.E.children(':selected').not(':disabled').text();
                    }

                    is_placeholder = false;

                    if (!_this.placeholder) {

                        is_placeholder = true;

                        _this.placeholder = _this.E.attr('placeholder');
                        if (!_this.placeholder)                  //if placeholder is there then set it
                        {
                            _this.placeholder = _this.E.children('option:disabled:selected').text();
                            //if (!_this.placeholder && settings.placeholder === 'Select Here')
                            //    _this.placeholder = _this.E.val();
                        }
                    }

                    _this.placeholder = _this.placeholder ? _this.placeholder : settings.placeholder

                    //set display text
                    _this.caption.html(_this.placeholder);

                    //set the hidden field if post as csv is true.
                    csvField = _this.select.find('input.HEMANT123');
                    if (csvField.length) csvField.val(_this.getSelStr());

                    //add class placeholder if its a placeholder text.
                    if (is_placeholder) _this.caption.addClass('placeholder'); else _this.caption.removeClass('placeholder');
                    return _this.placeholder;
                },

                isMobile: function () {

                    // Adapted from http://www.detectmobilebrowsers.com
                    var ua = (window.navigator.userAgent || "").toLowerCase();

                    // Checks for iOS, Android, Blackberry, Opera Mini, and Windows Mobile devices
                    for (var i = 0; i < settings.nativeOnDevice.length; i++) if (ua.indexOf(settings.nativeOnDevice[i].toLowerCase()) > 0) return true;
                    return false;
                },

                setNativeMobile: function () {
                    var _this = this;
                    _this.E.addClass('SelectClass')//.css('height', _this.select.outerHeight());
					_this.mob = true;
                    _this.E.change(function () {
                        _this.setText();
                    });
                },

                floatingList: function () {
                    var _this = this;
                    //called on init and also on resize.
                    //_this.is_floating = true if window width is < specified float width
                    _this.is_floating = $(window).width() <= settings.floatWidth;

                    //set class isFloating
                    _this.optDiv.toggleClass('isFloating', _this.is_floating);
                    _this.CaptionCont.toggleClass('isFloating', _this.is_floating);

                    //remove height if not floating
                    if (!_this.is_floating) _this.optDiv.css('height', '');

                    //toggle class according to okCancelInMulti flag only when it is not floating
                    _this.optDiv.toggleClass('okCancelInMulti', settings.okCancelInMulti && !_this.is_floating);
                },

                //HELPERS FOR OUTSIDERS
                // validates range of given item operations
                vRange: function (i) {
                    var _this = this;
                    opts = _this.E.children('option');
                    if (opts.length <= i || i < 0) throw "index out of bounds"
                    return _this;
                },

                //toggles selection on c as boolean.
                toggSel: function (c, i) {
                    var _this = this.vRange(i);
                    if (_this.E.children('option')[i].disabled) return;
                    _this.E.children('option')[i].selected = c;
                    if(!_this.mob)_this.optDiv.find('ul.options li').eq(i).toggleClass('selected',c);
                    _this.setText();
                },

                //toggles disabled on c as boolean.
                toggDis: function (c, i) {
                    var _this = this.vRange(i);
                    _this.E.children('option')[i].disabled = c;
                    if(c)_this.E.children('option')[i].selected = false;
                    if(!_this.mob)_this.optDiv.find('ul.options li').eq(i).toggleClass('disabled', c).removeClass('selected');
                    _this.setText();
                },

                // toggle disable/enable on complete select control
                toggSumo: function(val) {
                    var _this = this;
                    _this.enabled = val;
                    _this.select.toggleClass('disabled', val);

                    if (val) {
                        _this.E.attr('disabled', 'disabled');
                        _this.select.removeAttr('tabindex');
                    }
                    else{
                        _this.E.removeAttr('disabled');
                        _this.select.attr('tabindex','0');
                    }

                    return _this;
                },

                //toggles alloption on c as boolean.
                toggSelAll: function (c) {
                    var _this = this;
                    _this.E.find('option').each(function (ix, el) {
                        if (_this.E.find('option')[$(this).index()].disabled) return;
                        _this.E.find('option')[$(this).index()].selected = c;
                        if (!_this.mob)
							_this.optDiv.find('ul.options li').eq($(this).index()).toggleClass('selected', c);
                        _this.setText();
                    });
                    if(!_this.mob && settings.selectAll)_this.selAll.removeClass('partial').toggleClass('selected',c);
                },

                /* outside accessibility options
                   which can be accessed from the element instance.
                */
                reload:function(){
                    var elm = this.unload();
                    return $(elm).SumoSelect(settings);
                },

                unload: function () {
                    var _this = this;
                    _this.select.before(_this.E);
                    _this.E.show();

                    if (settings.outputAsCSV && _this.is_multi && _this.select.find('input.HEMANT123').length) {
                        _this.E.attr('name', _this.select.find('input.HEMANT123').attr('name')); // restore the name;
                    }
                    _this.select.remove();
                    delete selObj.sumo;
                    return selObj;
                },

                //## add a new option to select at a given index.
                add: function (val, txt, i) {
                    if (val === undefined) throw "No value to add"

                    var _this = this;
                    opts=_this.E.children('option')
                    if (typeof txt == "number") { i = txt; txt = val; }
                    if (txt === undefined) { txt = val; }

                    opt = $("<option></option>").val(val).html(txt);

                    if (opts.length < i) throw "index out of bounds"

                    if (i === undefined || opts.length == i) { // add it to the last if given index is last no or no index provides.
                        _this.E.append(opt);
                        if(!_this.mob)_this.createLi(opt);
                    }
                    else {
                        opts.eq(i).before(opt);
                        if(!_this.mob)_this.createLi(opt, i);
                    }

                    return selObj;
                },

                //## removes an item at a given index.
                remove: function (i) {
                    var _this = this.vRange(i);
                    _this.E.children('option').eq(i).remove();
                    if(!_this.mob)_this.optDiv.find('ul.options li').eq(i).remove();
                    _this.setText();
                },

                //## Select an item at a given index.
                selectItem: function (i) { this.toggSel(true, i); },

                //## UnSelect an iten at a given index.
                unSelectItem: function (i) { this.toggSel(false, i); },

                //## Select all items  of the select.
                selectAll: function () { this.toggSelAll(true); },

                //## UnSelect all items of the select.
                unSelectAll: function () { this.toggSelAll(false); },

                //## Disable an iten at a given index.
                disableItem: function (i) { this.toggDis(true, i) },

                //## Removes disabled an iten at a given index.
                enableItem: function (i) { this.toggDis(false, i) },

                //## New simple methods as getter and setter are not working fine in ie8-
                //## variable to check state of control if enabled or disabled.
                enabled : true,
                //## Enables the control
                enable: function(){return this.toggSumo(false)},

                //## Disables the control
                disable: function(){return this.toggSumo(true)},


                init: function () {
                    var _this = this;
                    _this.createElems();
                    _this.setText();
                    return _this
                }

            };

            selObj.sumo.init();
        });

        return ret.length == 1 ? ret[0] : ret;
    };


}(jQuery, window, document));
