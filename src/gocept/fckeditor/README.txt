=========
FCKEditor
=========

Initialize::

    >>> from zope.testbrowser.testing import Browser
    >>> browser = Browser()


Initlally Broken Pages
======================

There are some pages which are just plain broken. Assert we have fixed those::

    >>> browser.open(
    ...    'http://localhost:8080/@@/gocept.fckeditor/'
    ...    'editor/filemanager/browser/default/frmresourceslist.html')
    >>> print browser.contents
    <!DOCTYPE ...
    >>> browser.open(
    ...    'http://localhost:8080/@@/gocept.fckeditor/'
    ...    'editor/filemanager/browser/default/frmfolders.html')
    >>> print browser.contents
    <!DOCTYPE ...
