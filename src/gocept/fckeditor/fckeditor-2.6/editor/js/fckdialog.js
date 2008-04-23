/*
 * FCKeditor - The text editor for Internet - http://www.fckeditor.net
 * Copyright (C) 2003-2008 Frederico Caldeira Knabben
 *
 * == BEGIN LICENSE ==
 *
 * Licensed under the terms of any of the following licenses at your
 * choice:
 *
 *  - GNU General Public License Version 2 or later (the "GPL")
 *    http://www.gnu.org/licenses/gpl.html
 *
 *  - GNU Lesser General Public License Version 2.1 or later (the "LGPL")
 *    http://www.gnu.org/licenses/lgpl.html
 *
 *  - Mozilla Public License Version 1.1 or later (the "MPL")
 *    http://www.mozilla.org/MPL/MPL-1.1.html
 *
 * == END LICENSE ==
 */

// Domain relaxation logic.
(function()
{
	var d = document.domain ;

	while ( true )
	{
		// Test if we can access a parent property.
		try
		{
			var parentDomain = ( Args().TopWindow || E ).document.domain ;

			if ( document.domain != parentDomain )
				document.domain = parentDomain ;

			break ;
		}
		catch( e ) {}

		// Remove a domain part: www.mytest.example.com => mytest.example.com => example.com ...
		d = d.replace( /.*?(?:\.|$)/, '' ) ;

		if ( d.length == 0 )
			break ;		// It was not able to detect the domain.

		document.domain = d ;
	}
})() ;

var E = frameElement._DialogArguments.Editor ;

// It seems referencing to frameElement._DialogArguments directly would lead to memory leaks in IE.
// So let's use functions to access its members instead.
function Args()
{
	return frameElement._DialogArguments ;
}

function ParentDialog( dialog )
{
	return dialog ? dialog._ParentDialog : frameElement._ParentDialog ;
}

var FCK				= E.FCK ;
var FCKTools		= E.FCKTools ;
var FCKDomTools		= E.FCKDomTools ;
var FCKDialog		= E.FCKDialog ;
var FCKBrowserInfo	= E.FCKBrowserInfo ;
var FCKConfig		= E.FCKConfig ;

// Steal the focus so that the caret would no longer stay in the editor iframe.
window.focus() ;

// Sets the Skin CSS
document.write( FCKTools.GetStyleHtml( FCKConfig.SkinDialogCSS ) ) ;

// Sets the language direction.
var langDir = document.documentElement.dir = E.FCKLang.Dir ;

// For IE6-, the fck_dialog_ie6.js is loaded, used to fix limitations in the browser.
if ( FCKBrowserInfo.IsIE && !FCKBrowserInfo.IsIE7 )
	document.write( '<' + 'script type="text/javascript" src="' + FCKConfig.SkinPath + 'fck_dialog_ie6.js"><' + '\/script>' ) ;

FCKTools.RegisterDollarFunction( window ) ;

// Resize related functions.
var Sizer = function()
{
	var bAutoSize = false ;

	var retval = {
		// Sets whether the dialog should auto-resize according to its content's height.
		SetAutoSize : function( autoSize )
		{
			bAutoSize = autoSize ;
			this.RefreshSize() ;
		},

		// Fit the dialog container's layout to the inner iframe's external size.
		RefreshContainerSize : function()
		{
			var frmMain = $( 'frmMain' ) ;

			if ( frmMain )
			{
				// Get the container size.
				var height = $( 'contents' ).offsetHeight ;

				// Subtract the size of other elements.
				height -= $( 'TitleArea' ).offsetHeight ;
				height -= $( 'TabsRow' ).offsetHeight ;
				height -= $( 'PopupButtons' ).offsetHeight ;

				frmMain.style.height = Math.max( height, 0 ) + 'px' ;
			}
		},

		// Resize and re-layout the dialog.
		// Triggers the onresize event for the layout logic.
		ResizeDialog : function( width, height )
		{
			FCKDomTools.SetElementStyles( window.frameElement,
					{
						'width' : width + 'px',
						'height' : height + 'px'
					} ) ;

			// If the skin have defined a function for resize fixes, call it now.
			if ( typeof window.DoResizeFixes == 'function' )
				window.DoResizeFixes() ;
		},

		// if bAutoSize is true, automatically fit the dialog size and layout to
		// accomodate the inner iframe's internal height.
		// if bAutoSize is false, then only the layout logic for the dialog decorations
		// is run to accomodate the inner iframe's external height.
		RefreshSize : function()
		{
			if ( bAutoSize )
			{
				var frmMain		= $( 'frmMain' ) ;
				var innerDoc	= frmMain.contentWindow.document ;
				var isStrict	= FCKTools.IsStrictMode( innerDoc ) ;

				// Get the size of the frame contents.
				var innerWidth	= isStrict ? innerDoc.documentElement.scrollWidth : innerDoc.body.scrollWidth ;
				var innerHeight	= isStrict ? innerDoc.documentElement.scrollHeight : innerDoc.body.scrollHeight ;

				// Get the current frame size.
				var frameSize = FCKTools.GetViewPaneSize( frmMain.contentWindow ) ;

				var deltaWidth	= innerWidth - frameSize.Width ;
				var deltaHeight	= innerHeight - frameSize.Height ;

				// If the contents fits the current size.
				if ( deltaWidth <= 0 && deltaHeight <= 0 )
					return ;

				var dialogWidth		= frameElement.offsetWidth + Math.max( deltaWidth, 0 ) ;
				var dialogHeight	= frameElement.offsetHeight + Math.max( deltaHeight, 0 ) ;

				this.ResizeDialog( dialogWidth, dialogHeight ) ;
			}
			this.RefreshContainerSize() ;
		}
	}

	/**
	 * Safari seems to have a bug with the time when RefreshSize() is executed - it
	 * thinks frmMain's innerHeight is 0 if we query the value too soon after the
	 * page is loaded in some circumstances. (#1316)
	 * TODO : Maybe this is not needed anymore after #35.
	 */
	if ( FCKBrowserInfo.IsSafari )
	{
		var originalRefreshSize = retval.RefreshSize ;

		retval.RefreshSize = function()
		{
			FCKTools.SetTimeout( originalRefreshSize, 1, retval ) ;
		}
	}

	window.onresize = function()
	{
		retval.RefreshContainerSize() ;
	}

	window.SetAutoSize = FCKTools.Bind( retval, retval.SetAutoSize ) ;

	return retval ;
}() ;

// Manages the throbber image that appears if the inner part of dialog is taking too long to load.
var Throbber = function()
{
	var timer ;

	var updateThrobber = function()
	{
		var throbberParent = $( 'throbberBlock' ) ;
		var throbberBlocks = throbberParent.childNodes ;
		var lastClass = throbberParent.lastChild.className ;

		// From the last to the second one, copy the class from the previous one.
		for ( var i = throbberBlocks.length - 1 ; i > 0 ; i-- )
			throbberBlocks[i].className = throbberBlocks[i-1].className ;

		// For the first one, copy the last class (rotation).
		throbberBlocks[0].className = lastClass ;
	}

	return {
		Show : function( waitMilliseconds )
		{
			// Auto-setup the Show function to be called again after the
			// requested amount of time.
			if ( waitMilliseconds && waitMilliseconds > 0 )
			{
				timer = FCKTools.SetTimeout( this.Show, waitMilliseconds, this, null, window ) ;
				return ;
			}

			var throbberParent = $( 'throbberBlock' ) ;

			// Create the throbber blocks.
			var classIds = [ 1,2,3,4,5,4,3,2 ] ;
			while ( classIds.length > 0 )
				throbberParent.appendChild( document.createElement( 'div' ) ).className = ' throbber_' + classIds.shift() ;

			// Center the throbber.
			var frm = $( 'contents' ) ;
			var frmCoords = FCKTools.GetDocumentPosition( window, frm ) ;
			var x = frmCoords.x + ( frm.offsetWidth - throbberParent.offsetWidth ) / 2 ;
			var y = frmCoords.y + ( frm.offsetHeight - throbberParent.offsetHeight ) / 2 ;
			throbberParent.style.left = parseInt( x, 10 ) + 'px' ;
			throbberParent.style.top = parseInt( y, 10 ) + 'px' ;

			// Show it.
			throbberParent.style.visibility = ''  ;

			// Setup the animation interval.
			timer = setInterval( updateThrobber, 100 ) ;
		},

		Hide : function()
		{
			if ( timer )
			{
				clearInterval( timer ) ;
				timer = null ;
			}

			var throbberParent = document.getElementById( 'throbberBlock' ) ;
			if ( throbberParent )
				FCKDomTools.RemoveNode( throbberParent ) ;
		}
	} ;
}() ;

// Drag and drop handlers.
var DragAndDrop = function()
{
	var registeredWindows = [] ;
	var lastCoords ;
	var currentPos ;

	var cleanUpHandlers = function()
	{
		for ( var i = 0 ; i < registeredWindows.length ; i++ )
		{
			FCKTools.RemoveEventListener( registeredWindows[i].document, 'mousemove', dragMouseMoveHandler ) ;
			FCKTools.RemoveEventListener( registeredWindows[i].document, 'mouseup', dragMouseUpHandler ) ;
		}
	}

	var dragMouseMoveHandler = function( evt )
	{
		if ( !lastCoords )
			return ;

		if ( !evt )
			evt = FCKTools.GetElementDocument( this ).parentWindow.event ;

		// Updated the last coordinates.
		var currentCoords =
		{
			x : evt.screenX,
			y : evt.screenY
		} ;

		currentPos =
		{
			x : currentPos.x + ( currentCoords.x - lastCoords.x ),
			y : currentPos.y + ( currentCoords.y - lastCoords.y )
		} ;

		lastCoords = currentCoords ;

		frameElement.style.left	= currentPos.x + 'px' ;
		frameElement.style.top	= currentPos.y + 'px' ;

		if ( evt.preventDefault )
			evt.preventDefault() ;
		else
			evt.returnValue = false ;
	}

	var dragMouseUpHandler = function( evt )
	{
		if ( !lastCoords )
			return ;
		if ( !evt )
			evt = FCKTools.GetElementDocument( this ).parentWindow.event ;
		cleanUpHandlers() ;
		lastCoords = null ;
	}

	return {

		MouseDownHandler : function( evt )
		{
			var view = null ;
			if ( !evt )
			{
				view = FCKTools.GetElementDocument( this ).parentWindow ;
				evt = view.event ;
			}
			else
				view = evt.view ;

			var target = evt.srcElement || evt.target ;
			if ( target.id == 'closeButton' || target.className == 'PopupTab' || target.className == 'PopupTabSelected' )
				return ;

			lastCoords =
			{
				x : evt.screenX,
				y : evt.screenY
			} ;

			// Save the current IFRAME position.
			currentPos =
			{
				x : parseInt( FCKDomTools.GetCurrentElementStyle( frameElement, 'left' ), 10 ),
				y : parseInt( FCKDomTools.GetCurrentElementStyle( frameElement, 'top' ), 10 )
			} ;

			for ( var i = 0 ; i < registeredWindows.length ; i++ )
			{
				FCKTools.AddEventListener( registeredWindows[i].document, 'mousemove', dragMouseMoveHandler ) ;
				FCKTools.AddEventListener( registeredWindows[i].document, 'mouseup', dragMouseUpHandler ) ;
			}

			if ( evt.preventDefault )
				evt.preventDefault() ;
			else
				evt.returnValue = false ;
		},

		RegisterHandlers : function( w )
		{
			registeredWindows.push( w ) ;
		}
	}
}() ;

// Selection related functions.
//(Became simple shortcuts after the fix for #1990)
var Selection =
{
	/**
	 * Ensures that the editing area contains an active selection. This is a
	 * requirement for IE, as it looses the selection when the focus moves to other
	 * frames.
	 */
	EnsureSelection : function()
	{
		FCK.Selection.Restore() ;
	},

	/**
	 * Get the FCKSelection object for the editor instance.
	 */
	GetSelection : function()
	{
		return FCK.Selection ;
	},

	/**
	 * Get the selected element in the editing area (for object selections).
	 */
	GetSelectedElement : function()
	{
		return FCK.Selection.GetSelectedElement() ;
	}
}

// Tab related functions.
var Tabs = function()
{
	// Only element ids should be stored here instead of element references since setSelectedTab and TabDiv_OnClick
	// would build circular references with the element references inside and cause memory leaks in IE6.
	var oTabs = new Object() ;

	var setSelectedTab = function( tabCode )
	{
		for ( var sCode in oTabs )
		{
			if ( sCode == tabCode )
				$( oTabs[sCode] ).className = 'PopupTabSelected' ;
			else
				$( oTabs[sCode] ).className = 'PopupTab' ;
		}

		if ( typeof( window.frames["frmMain"].OnDialogTabChange ) == 'function' )
			window.frames["frmMain"].OnDialogTabChange( tabCode ) ;
	}

	function TabDiv_OnClick()
	{
		setSelectedTab( this.TabCode ) ;
	}

	window.AddTab = function( tabCode, tabText, startHidden )
	{
		if ( typeof( oTabs[ tabCode ] ) != 'undefined' )
			return ;

		var eTabsRow = $( 'Tabs' ) ;

		var oCell = eTabsRow.insertCell(  eTabsRow.cells.length - 1 ) ;
		oCell.noWrap = true ;

		var oDiv = document.createElement( 'DIV' ) ;
		oDiv.className = 'PopupTab' ;
		oDiv.innerHTML = tabText ;
		oDiv.TabCode = tabCode ;
		oDiv.onclick = TabDiv_OnClick ;
		oDiv.id = Math.random() ;

		if ( startHidden )
			oDiv.style.display = 'none' ;

		eTabsRow = $( 'TabsRow' ) ;

		oCell.appendChild( oDiv ) ;

		if ( eTabsRow.style.display == 'none' )
		{
			var eTitleArea = $( 'TitleArea' ) ;
			eTitleArea.className = 'PopupTitle' ;

			oDiv.className = 'PopupTabSelected' ;
			eTabsRow.style.display = '' ;

			if ( window.onresize )
				window.onresize() ;
		}

		oTabs[ tabCode ] = oDiv.id ;

		FCKTools.DisableSelection( oDiv ) ;
	} ;

	window.SetSelectedTab = setSelectedTab ;

	window.SetTabVisibility = function( tabCode, isVisible )
	{
		var oTab = $( oTabs[ tabCode ] ) ;
		oTab.style.display = isVisible ? '' : 'none' ;

		if ( ! isVisible && oTab.className == 'PopupTabSelected' )
		{
			for ( var sCode in oTabs )
			{
				if ( $( oTabs[sCode] ).style.display != 'none' )
				{
					setSelectedTab( sCode ) ;
					break ;
				}
			}
		}
	} ;
}() ;

// readystatechange handler for registering drag and drop handlers in cover
// iframes, defined out here to avoid memory leak.
// Do NOT put this function as a private function as it will induce memory leak
// in IE and it's not detectable with Drip or sIEve and undetectable leaks are
// really nasty (sigh).
var onReadyRegister = function()
{
	if ( this.readyState != 'complete' )
		return ;
	DragAndDrop.RegisterHandlers( this.contentWindow ) ;
} ;

// The business logic of the dialog, dealing with operational things like
// dialog open/dialog close/enable/disable/etc.
(function()
{
	var setOnKeyDown = function( targetDocument )
	{
		targetDocument.onkeydown = function ( e )
		{
			e = e || event || this.parentWindow.event ;
			switch ( e.keyCode )
			{
				case 13 :		// ENTER
					var oTarget = e.srcElement || e.target ;
					if ( oTarget.tagName == 'TEXTAREA' )
						return true ;
					Ok() ;
					return false ;

				case 27 :		// ESC
					Cancel() ;
					return false ;
			}
			return true ;
		}
	} ;

	var contextMenuBlocker = function( e )
	{
		var sTagName = e.target.tagName ;
		if ( ! ( ( sTagName == "INPUT" && e.target.type == "text" ) || sTagName == "TEXTAREA" ) )
			e.preventDefault() ;
	} ;

	var disableContextMenu = function( targetDocument )
	{
		if ( FCKBrowserInfo.IsIE )
			return ;

		targetDocument.addEventListener( 'contextmenu', contextMenuBlocker, true ) ;
	} ;

	// Program entry point.
	window.Init = function()
	{
		// Start the throbber timer.
		Throbber.Show( 1000 ) ;

		Sizer.RefreshContainerSize() ;
		LoadInnerDialog() ;

		FCKTools.DisableSelection( document.body ) ;

		// Make the title area draggable.
		var titleElement = $( 'header' ) ;
		titleElement.onmousedown = DragAndDrop.MouseDownHandler ;

		// Connect mousemove and mouseup events from dialog frame and outer window to dialog dragging logic.
		DragAndDrop.RegisterHandlers( window ) ;
		DragAndDrop.RegisterHandlers( Args().TopWindow ) ;

		// Disable the previous dialog if it exists.
		if ( ParentDialog() )
		{
			ParentDialog().contentWindow.SetEnabled( false ) ;
			if ( FCKBrowserInfo.IsIE && !FCKBrowserInfo.IsIE7 )
			{
				var currentParent = ParentDialog() ;
				while ( currentParent )
				{
					var blockerFrame = currentParent.contentWindow.$( 'blocker' ) ;
					if ( blockerFrame.readyState == 'complete' )
						DragAndDrop.RegisterHandlers( blockerFrame.contentWindow ) ;
					else
						blockerFrame.onreadystatechange = onReadyRegister ;
					currentParent = ParentDialog( currentParent ) ;
				}
			}
			else
			{
				var currentParent = ParentDialog() ;
				while ( currentParent )
				{
					DragAndDrop.RegisterHandlers( currentParent.contentWindow ) ;
					currentParent = ParentDialog( currentParent ) ;
				}
			}
		}

		// If this is the only dialog on screen, enable the background cover.
		if ( FCKBrowserInfo.IsIE && !FCKBrowserInfo.IsIE7 )
		{
			var blockerFrame = FCKDialog.GetCover().firstChild ;
			if ( blockerFrame.readyState == 'complete' )
				DragAndDrop.RegisterHandlers( blockerFrame.contentWindow ) ;
			else
				blockerFrame.onreadystatechange = onReadyRegister;
		}

		// Add Enter/Esc hotkeys and disable context menu for the dialog.
		setOnKeyDown( document ) ;
		disableContextMenu( document ) ;
	} ;

	window.LoadInnerDialog = function()
	{
		if ( window.onresize )
			window.onresize() ;

		// First of all, translate the dialog box contents.
		E.FCKLanguageManager.TranslatePage( document ) ;

		// Create the IFRAME that holds the dialog contents.
		$( 'innerContents' ).innerHTML = '<iframe id="frmMain" src="' + Args().Page + '" name="frmMain" frameborder="0" width="100%" height="100%" scrolling="auto" style="visibility: hidden;" allowtransparency="true"></iframe>' ;
	} ;

	window.InnerDialogLoaded = function()
	{
		// If the dialog has been closed before the iframe is loaded, do nothing.
		if ( !frameElement.parentNode )
			return null ;

		Throbber.Hide() ;

		var frmMain = $('frmMain') ;
		var innerWindow = frmMain.contentWindow ;
		var innerDoc = innerWindow.document ;

		// Show the loaded iframe.
		frmMain.style.visibility = '' ;

		// Set the language direction.
		innerDoc.documentElement.dir = langDir ;

		// Sets the Skin CSS.
		innerDoc.write( FCKTools.GetStyleHtml( FCKConfig.SkinDialogCSS ) ) ;

		setOnKeyDown( innerDoc ) ;
		disableContextMenu( innerDoc ) ;

		Sizer.RefreshContainerSize();

		DragAndDrop.RegisterHandlers( innerWindow ) ;

		innerWindow.focus() ;

		return E ;
	} ;

	window.SetOkButton = function( showIt )
	{
		$('btnOk').style.visibility = ( showIt ? '' : 'hidden' ) ;
	} ;

	window.Ok = function()
	{
		Selection.EnsureSelection() ;

		var frmMain = window.frames["frmMain"] ;

		if ( frmMain.Ok && frmMain.Ok() )
			CloseDialog() ;
		else
			frmMain.focus() ;
	} ;

	window.Cancel = function( dontFireChange )
	{
		Selection.EnsureSelection() ;
		return CloseDialog( dontFireChange ) ;
	} ;

	window.CloseDialog = function( dontFireChange )
	{
		Throbber.Hide() ;

		// Points the src to a non-existent location to avoid loading errors later, in case the dialog
		// haven't been completed loaded at this point.
		if ( $( 'frmMain' ) )
			$( 'frmMain' ).src = FCKTools.GetVoidUrl() ;

		if ( !dontFireChange && !FCK.EditMode )
		{
			// All dialog windows, by default, will fire the "OnSelectionChange"
			// event, no matter the Ok or Cancel button has been pressed.
			// It seems that OnSelectionChange may enter on a concurrency state
			// on some situations (#1965), so we should put the event firing in
			// the execution queue instead of executing it immediately.
			setTimeout( function()
				{
					FCK.Events.FireEvent( 'OnSelectionChange' ) ;
				}, 0 ) ;
		}

		FCKDialog.OnDialogClose( window ) ;
	} ;

	window.SetEnabled = function( isEnabled )
	{
		var cover = $( 'cover' ) ;
		cover.style.display = isEnabled ? 'none' : '' ;

		if ( FCKBrowserInfo.IsIE && !FCKBrowserInfo.IsIE7 )
		{
			if ( !isEnabled )
			{
				// Inser the blocker IFRAME before the cover.
				var blocker = document.createElement( 'iframe' ) ;
				blocker.src = FCKTools.GetVoidUrl() ;
				blocker.hideFocus = true ;
				blocker.frameBorder = 0 ;
				blocker.id = blocker.className = 'blocker' ;
				cover.appendChild( blocker ) ;
			}
			else
			{
				var blocker = $( 'blocker' ) ;
				if ( blocker && blocker.parentNode )
					blocker.parentNode.removeChild( blocker ) ;
			}
		}
	} ;
})() ;
