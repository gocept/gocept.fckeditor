# Copyright (c) 2007-2009 gocept gmbh & co. kg
# See also LICENSE.txt

import os
import unittest

from zope.testing import doctest

import zope.app.testing.functional


FCKEditorLayer = zope.app.testing.functional.ZCMLLayer(
    os.path.join(os.path.dirname(__file__), 'ftesting.zcml'),
    __name__, 'FCKEditorLayer', allow_teardown=True)


def test_suite():
    suite = unittest.TestSuite()
    ftest = zope.app.testing.functional.FunctionalDocFileSuite(
        'README.txt',
        optionflags=(doctest.REPORT_NDIFF + doctest.NORMALIZE_WHITESPACE +
                     doctest.ELLIPSIS))
    ftest.layer = FCKEditorLayer
    suite.addTest(ftest)
    return suite

