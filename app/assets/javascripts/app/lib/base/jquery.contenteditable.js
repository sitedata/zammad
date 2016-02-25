(function ($) {

/*
# mode:          textonly/richtext / disable b/i/u/enter + strip on paste
# pasteOnlyText: true
# maxlength:     123
# multiline:     true / disable enter + strip on paste
# placeholder:   'some placeholder'
*/

  var pluginName = 'ce',
  defaults = {
    debug:     false,
    mode:      'richtext',
    multiline: true,
    allowKey:  {
      8: true, // backspace
      9: true, // tab
      16: true, // shift
      17: true, // ctrl
      18: true, // alt
      20: true, // cabslock
      37: true, // up
      38: true, // right
      39: true, // down
      40: true, // left
      91: true, // cmd left
      92: true, // cmd right
      224: true, // cmd left
    },
    extraAllowKey: {
      65: true, // a + ctrl - select all
      67: true, // c + ctrl - copy
      86: true, // v + ctrl - paste
      88: true, // x + ctrl - cut
      90: true, // z + ctrl - undo
    },
    richTextFormatKey: {
      66: true, // b
      73: true, // i
      85: true, // u
    },
    //maxlength: 20,
  };

  function Plugin( element, options ) {
    this.element  = element;
    this.$element = $(element)

    this.options = $.extend( {}, defaults, options) ;

    this._defaults = defaults;
    this._name     = pluginName;

    // take placeholder from markup
    if ( !this.options.placeholder && this.$element.data('placeholder') ) {
      this.options.placeholder = this.$element.data('placeholder')
    }

    this.preventInput = false

    this.init();
  }


  Plugin.prototype.init = function () {
    var _this = this

    this.toggleBlock = function(tag) {
      sel = window.getSelection()
      node = $(sel.anchorNode)
      console.log('toggleBlock', tag, node.parent(), node.is())
      if (node.is(tag) || node.parent().is(tag) || node.parent().parent().is(tag)) {
        document.execCommand('formatBlock', false, 'div')
        //document.execCommand('RemoveFormat')
      }
      else {
        document.execCommand('formatBlock', false, tag)
      }
    }

    // handle enter
    this.$element.on('keydown', function (e) {
      _this.log('keydown', e.keyCode)
      if ( _this.preventInput ) {
        this.log('preventInput', _this.preventInput)
        return
      }

      // strap the return key being pressed
      if (e.keyCode === 13) {

        // disbale multi line
        if ( !_this.options.multiline ) {
          e.preventDefault()
          return
        }

        // break <blockquote> after enter on empty line
        sel = window.getSelection()
        node = $(sel.anchorNode)
        if (node.parent().is('blockquote')) {
          e.preventDefault()
          document.execCommand('Insertparagraph')
          document.execCommand('Outdent')
        }
      }

      // on zammad altKey + ctrlKey + i/b/u
      //  altKey + ctrlKey + u -> Toggles the current selection between underlined and not underlined
      //  altKey + ctrlKey + b -> Toggles the current selection between bold and non-bold
      //  altKey + ctrlKey + i -> Toggles the current selection between italic and non-italic
      //  altKey + ctrlKey + v -> Toggles the current selection between strike and non-strike
      //  altKey + ctrlKey + f -> Removes the formatting tags from the current selection
      //  altKey + ctrlKey + z -> Inserts a Horizontal Rule
      //  altKey + ctrlKey + l -> Toggles the text selection between an unordered list and a normal block
      //  altKey + ctrlKey + k -> Toggles the text selection between an ordered list and a normal block
      //  altKey + ctrlKey + o -> Draws a line through the middle of the current selection
      //  altKey + ctrlKey + w -> Removes any hyperlink from the current selection
      if ( e.altKey && e.ctrlKey && !e.metaKey && (_this.options.richTextFormatKey[ e.keyCode ]
        || e.keyCode == 49
        || e.keyCode == 50
        || e.keyCode == 51
        || e.keyCode == 70
        || e.keyCode == 90
        || e.keyCode == 76
        || e.keyCode == 75
        || e.keyCode == 86
        || e.keyCode == 87)) {
        e.preventDefault()

        // disable rich text b/u/i
        if ( _this.options.mode === 'textonly' ) {
          return
        }

        if (e.keyCode == 66) {
          document.execCommand('Bold')
        }
        if (e.keyCode == 73) {
          document.execCommand('Italic')
        }
        if (e.keyCode == 85) {
          document.execCommand('Underline')
        }
        if (e.keyCode == 70) {
          document.execCommand('RemoveFormat')
        }
        if (e.keyCode == 90) {
          document.execCommand('insertHorizontalRule')
        }
        if (e.keyCode == 76) {
          document.execCommand('InsertUnorderedList')
        }
        if (e.keyCode == 75) {
          document.execCommand('InsertOrderedList')
        }
        if (e.keyCode == 86) {
          document.execCommand('StrikeThrough')
        }
        if (e.keyCode == 87) {
          document.execCommand('Unlink')
        }
        if (e.keyCode == 49) {
          _this.toggleBlock('h1')
        }
        if (e.keyCode == 50) {
          _this.toggleBlock('h2')
        }
        if (e.keyCode == 51) {
          _this.toggleBlock('h3')
        }
        _this.log('content editable richtext key', e.keyCode)
        return true
      }

      // limit check
      if ( !_this.allowKey(e) ) {
        if ( !_this.maxLengthOk( 1 ) ) {
          e.preventDefault()
          return
        }
      }
    })

    // just paste text
    this.$element.on('paste', function (e) {
      e.preventDefault()
      _this.log('paste')

      // check existing + paste text for limit
      var text = e.originalEvent.clipboardData.getData('text/html')
      var docType = 'html'
      if (!text || text.length === 0) {
          docType = 'text'
          text = e.originalEvent.clipboardData.getData('text/plain')
      }
      if (!text || text.length === 0) {
          docType = 'text2'
          text = e.originalEvent.clipboardData.getData('text')
      }
      _this.log('paste', docType, text)

      if (docType == 'html') {
        text = '<div>' + text + '</div>' // to prevent multible dom object. we need it at level 0
        if (_this.options.mode === 'textonly') {
          if (!_this.options.multiline) {
            text = App.Utils.htmlRemoveTags(text)
            _this.log('htmlRemoveTags', text)
          }
          else {
            _this.log('htmlRemoveRichtext', text)
            text = App.Utils.htmlRemoveRichtext(text)
          }
        }
        else {
          _this.log('htmlCleanup', text)
          text = App.Utils.htmlCleanup(text)
        }
        text = text.html()
        _this.log('text.html()', text)

        // as fallback, take text
        if (!text) {
          text = App.Utils.text2html(text.text())
          _this.log('text2html', text)
        }
      }
      else {
        text = App.Utils.text2html(text)
        _this.log('text2html', text)
      }

      if (!_this.maxLengthOk(text.length)) {
        return
      }

      // cleanup
      text = App.Utils.removeEmptyLines(text)
      _this.log('insert', text)
      document.execCommand('insertHTML', false, text)
      return true
    })
  }

  // check if key is allowed, even if length limit is reached
  Plugin.prototype.allowKey = function(e) {
    if ( this.options.allowKey[ e.keyCode ] ) {
      return true
    }
    if ( ( e.ctrlKey || e.metaKey ) && this.options.extraAllowKey[ e.keyCode ] ) {
      return true
    }
    return false
  }

  // check if rich text key is pressed
  Plugin.prototype.richTextKey = function(e) {
    // e.altKey
    // e.ctrlKey
    // e.metaKey
    // on mac block e.metaKey + i/b/u
    if ( !e.altKey && e.metaKey && this.options.richTextFormatKey[ e.keyCode ] ) {
      return true
    }
    // on win block e.ctrlKey + i/b/u
    if ( !e.altKey && e.ctrlKey && this.options.richTextFormatKey[ e.keyCode ] ) {
      return true
    }
    return false
  }

  // max length check
  Plugin.prototype.maxLengthOk = function(typeAhead) {
    if ( !this.options.maxlength ) {
      return true
    }
    var length = this.$element.text().length
    if (typeAhead) {
      length = length + typeAhead
    }
    this.log('maxLengthOk', length, this.options.maxlength)
    if ( length > this.options.maxlength ) {
      this.log('maxLengthOk, text too long')

      // try to set error on framework form
      var parent = this.$element.parent().parent()
      if ( parent.hasClass('controls') ) {
        parent.addClass('has-error')
        setTimeout($.proxy(function(){
            parent.removeClass('has-error')
          }, this), 1000)

        return false
      }

      // set validation on element
      else {
        this.$element.addClass('invalid')
        setTimeout($.proxy(function(){
            this.$element.removeClass('invalid')
          }, this), 1000)

        return false
      }
    }
    return true
  }

  // get value
  Plugin.prototype.value = function() {
    //this.updatePlaceholder( 'remove' )

    // get text
    if ( this.options.mode === 'textonly' ) {

      // strip html signes if multi line exists
      if ( this.options.multiline ) {

        // for validation, do not retrun empty content by empty tags
        text_plain = this.$element.text().trim()
        if ( !text_plain || text_plain == '' ) {
          return text_plain
        }
        return this.$element.html()
      }
      return this.$element.text().trim()
    }

    // for validation, do not retrun empty content by empty tags
    text_plain = this.$element.text().trim()
    if ( !text_plain || text_plain == '' ) {
      return text_plain
    }
    return this.$element.html().trim()
  }

  // log method
  Plugin.prototype.log = function() {
    if (App && App.Log) {
      App.Log.debug('contenteditable', arguments)
    }
    if (this.options.debug) {
      console.log(this._name, arguments)
    }
  }

  $.fn[pluginName] = function ( options ) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName,
        new Plugin( this, options ));
      }
    });
  }

  // get correct val if textbox
  $.fn.ceg = function() {
    var plugin = $.data(this[0], 'plugin_' + pluginName)
    return plugin.value()
  }

}(jQuery));