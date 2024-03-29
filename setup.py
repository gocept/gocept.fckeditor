from setuptools import setup, find_packages

setup(
    name='gocept.fckeditor',
    version='2.6.4.1-3.dev0',
    author="Christian Zagrodnick",
    author_email="cz@gocept.com",
    description="FCKEditor integration into Zope 3",
    long_description="XXX",
    license="ZPL 2.1",
    url='https://bitbucket.org/gocept/gocept.fckeditor',

    packages=find_packages('src'),
    package_dir={'': 'src'},

    include_package_data=True,
    zip_safe=False,

    namespace_packages=['gocept'],
    install_requires=[
        'setuptools',
        'zc.resourcelibrary',
    ],
    extras_require={
        'test': [
            'zope.testing',
            'zope.testbrowser',
            'zope.app.testing',
            'zope.app.zcmlfiles',
        ],
        'fanstatic': ['fanstatic'],
    },
    entry_points={
        'fanstatic.libraries': [
            'gocept_fckeditor=gocept.fckeditor.resources:lib',
        ],
    },
)
