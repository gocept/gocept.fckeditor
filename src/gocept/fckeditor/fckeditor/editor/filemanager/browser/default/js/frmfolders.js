var sActiveFolder ;

var bIsLoaded = false ;
var iIntervalId ;

var oListManager = new Object() ;

oListManager.Init = function()
{
	this.Table = document.getElementById('tableFiles') ;
	this.UpRow = document.getElementById('trUp') ;

	this.TableRows = new Object() ;
}

oListManager.Clear = function()
{
	// Remove all other rows available.
	while ( this.Table.rows.length > 1 )
		this.Table.deleteRow(1) ;

	// Reset the TableRows collection.
	this.TableRows = new Object() ;
}

oListManager.AddItem = function( folderName, folderPath )
{
	// Create the new row.
	var oRow = this.Table.insertRow(-1) ;
	oRow.className = 'FolderListFolder' ;

	// Build the link to view the folder.
	var sLink = '<a href="#" onclick="OpenFolder(\'' + folderPath + '\');return false;">' ;

	// Add the folder icon cell.
	var oCell = oRow.insertCell(-1) ;
	oCell.width = 16 ;
	oCell.innerHTML = sLink + '<img alt="" src="images/spacer.gif" width="16" height="16" border="0"></a>' ;

	// Add the folder name cell.
	oCell = oRow.insertCell(-1) ;
	oCell.noWrap = true ;
	oCell.innerHTML = '&nbsp;' + sLink + folderName + '</a>' ;

	this.TableRows[ folderPath ] = oRow ;
}

oListManager.ShowUpFolder = function( upFolderPath )
{
	this.UpRow.style.display = ( upFolderPath != null ? '' : 'none' ) ;

	if ( upFolderPath != null )
	{
		document.getElementById('linkUpIcon').onclick = document.getElementById('linkUp').onclick = function()
		{
			LoadFolders( upFolderPath ) ;
			return false ;
		}
	}
}

function CheckLoaded()
{
	if ( window.top.IsLoadedActualFolder
		// && window.top.IsLoadedCreateFolder
		// && window.top.IsLoadedUpload
		&& window.top.IsLoadedResourcesList )
	{
		window.clearInterval( iIntervalId ) ;
		bIsLoaded = true ;
		OpenFolder( sActiveFolder ) ;
	}
}

function OpenFolder( folderPath )
{
	sActiveFolder = folderPath ;

	if ( ! bIsLoaded )
	{
		if ( ! iIntervalId )
			iIntervalId = window.setInterval( CheckLoaded, 100 ) ;
		return ;
	}

	// Change the style for the select row (to show the opened folder).
	for ( var sFolderPath in oListManager.TableRows )
	{
		oListManager.TableRows[ sFolderPath ].className =
			( sFolderPath == folderPath ? 'FolderListCurrentFolder' : 'FolderListFolder' ) ;
	}

	// Set the current folder in all frames.
	window.parent.frames['frmActualFolder'].SetCurrentFolder( oConnector.ResourceType, folderPath ) ;

	// Load the resources list for this folder.
	window.parent.frames['frmResourcesList'].LoadResources( oConnector.ResourceType, folderPath ) ;
}

function LoadFolders( folderPath )
{
	// Clear the folders list.
	oListManager.Clear() ;

	// Get the parent folder path.
	var sParentFolderPath ;
	if ( folderPath != '/' )
		sParentFolderPath = folderPath.substring( 0, folderPath.lastIndexOf( '/', folderPath.length - 2 ) + 1 ) ;

	// Show/Hide the Up Folder.
	oListManager.ShowUpFolder( sParentFolderPath ) ;

	if ( folderPath != '/' )
	{
		sActiveFolder = folderPath ;
		oConnector.CurrentFolder = sParentFolderPath ;
		oConnector.SendCommand( 'GetFolders', null, GetFoldersCallBack ) ;
	}
	else
		OpenFolder( '/' ) ;
}

function GetFoldersCallBack( fckXml )
{
	if ( oConnector.CheckError( fckXml ) != 0 )
		return ;

	// Get the current folder path.
	var oNode = fckXml.SelectSingleNode( 'Connector/CurrentFolder' ) ;
	var sCurrentFolderPath = oNode.attributes.getNamedItem('path').value ;

	var oNodes = fckXml.SelectNodes( 'Connector/Folders/Folder' ) ;

	for ( var i = 0 ; i < oNodes.length ; i++ )
	{
		var sFolderName = oNodes[i].attributes.getNamedItem('name').value ;
		oListManager.AddItem( sFolderName, sCurrentFolderPath + sFolderName + "/" ) ;
	}

	OpenFolder( sActiveFolder ) ;
}

function SetResourceType( type )
{
	oConnector.ResourceType = type ;
	LoadFolders( '/' ) ;
}

window.onload = function()
{
	oListManager.Init() ;
	LoadFolders( '/' ) ;
}
