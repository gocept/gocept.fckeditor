import os
from setuptools import setup, find_packages

name = "gocept.fckeditor"
setup(
    name = name,
    version = "2.4",
    author = "Christian Zagrodnick",
    author_email = "cz@gocept.com",
    description = "FCKEditor integration into Zope 3",
    long_description = "XXX",
    license = "ZPL 2.1",
    url='https://svn.gocept.com/repos/gocept/gocept.fckeditor',
    zip_safe = False,
    packages = find_packages('src'),
    include_package_data = True,
    package_dir = {'':'src'},
    namespace_packages = ['gocept'],
    install_requires = [
        'setuptools',
        'zc.resourcelibrary'
    ]
    )
