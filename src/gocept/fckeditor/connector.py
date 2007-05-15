# Copyright (c) 2007 gocept gmbh & co. kg
# See also LICENSE.txt
# $Id$

import zope.cachedescriptors.property
import zope.traversing.interfaces

import zope.app.container.interfaces


class FCKEditorBrowser(object):

    @zope.cachedescriptors.property.Lazy
    def folders(self):
        command = self.request.get('Command')
        if command not in ('GetFolders', 'GetFoldersAndFiles'):
            return None
        return self._list_folders()

    @zope.cachedescriptors.property.Lazy
    def files(self):
        command = self.request.get('Command')
        if command not in ('GetFiles', 'GetFoldersAndFiles'):
            return None
        return self._list_files()

    @zope.cachedescriptors.property.Lazy
    def current_folder(self):
        path = self.request.get('CurrentFolder').lstrip('/')
        content = zope.traversing.interfaces.ITraverser(
            self.context).traverse(path)
        return content

    def _list_folders(self):
        folder = self.current_folder
        for name in folder:
            obj = folder[name]
            if zope.app.container.interfaces.IContainer.providedBy(obj):
                yield obj

    def _list_files(self):
        folder = self.current_folder
        for name in folder:
            obj = folder[name]
            if not zope.app.container.interfaces.IContainer.providedBy(obj):
                yield obj
