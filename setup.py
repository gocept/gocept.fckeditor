# Copyright (c) 2007-2009 gocept gmbh & co. kg
# See also LICENSE.txt

from setuptools import setup, find_packages

setup(
    name = 'gocept.fckeditor',
    version = "2.6.5dev",
    author = "Christian Zagrodnick",
    author_email = "cz@gocept.com",
    description = "FCKEditor integration into Zope 3",
    long_description = "XXX",
    license = "ZPL 2.1",
    url='https://svn.gocept.com/repos/gocept/gocept.fckeditor',

    packages = find_packages('src'),
    package_dir = {'': 'src'},

    include_package_data = True,
    zip_safe = False,

    namespace_packages = ['gocept'],
    install_requires = [
        'setuptools',
        'zc.resourcelibrary',
    ],
    extras_require = {
        'test': ['zope.testing',
                 'zope.testbrowser',
                 'zope.app.testing',
                 'zope.app.zcmlfiles',
                ],
    },
    )
