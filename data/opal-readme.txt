README file for Outer Planet Atmospheres Legacy (OPAL)
MAST webpage: https://archive.stsci.edu/hlsp/opal/
Refer to this HLSP with DOI: http://dx.doi.org/10.17909/T9G593

## INTRODUCTION
OPAL is a project to obtain long time baseline observations of the outer planets in order to understand their atmospheric dynamics and evolution as gas giants. The yearly observations from OPAL throughout the remainder of Hubble's operation will provide a legacy of time-domain images for use by planetary scientists. The project will ultimately observe all of the giant planets in the solar system (Jupiter, Saturn, Uranus, and Neptune) in a wide range of filters. The images are processed using an ellipsoid limb-fitting technique, with an additional fringe correction applied to the narrow-band filters only (e.g., FQ889N for Jupiter 2014-2015), which amounts to a few percent correction. Mosaics are created for each observed filter in a projection that spans 360 degrees of longitude. See the README files (on disk or in the tables below) for additional details on the data processing. The mosaics from each filter (in FITS format), as well as previews (in TIF format) are provided.

### Acknowledgements
Any publication that uses images or maps from the OPAL program should include the following statement in the Acknowledgments: 

"This work used data acquired from the NASA/ESA HST Space Telescope, associated with OPAL program (PI: Simon, GO13937), and archived by the Space Telescope Science Institute, which is operated by the Association of Universities for Research in Astronomy, Inc., under NASA contract NAS 5-26555. All maps are available at http://dx.doi.org/10.17909/T9G593."

## Data Products

The data files have the following naming convention:

hlsp_opal_hst_wfc3-uvis_<planet>-<rotation>_<filter>_v1_<type>.<ext>

where:
  <planet> = one of "jupiter", "saturn", "uranus", or "neptune"
  <rotation> = the rotation+epoch of the observation, in the format of <year><letter>, e.g., "jupiter-2015a" is the first rotation of Jupiter from Cycle 22, "jupiter-2015b" is the second rotation from Cycle 22. Keep in mind that HST cycles span two calendar years, since they start in Oct. and run through Sep. of the following year.
  <type> = Data product type, either "globalmap" for the science data product and full-size preview images, or "globalmap-medium" and "globalmap-small" for the smaller-sized preview images.  Some datasets, like Uranus Cycle 33, introduce a "northpolarmap" product type, where 0 degrees longitude is oriented to the right.  These also include the "northpolarmap-medium" and "northpolarmap-small" preview images.
  <ext> = File extension, either "fits" for the science data products, "tif" for the preview images, or "png" for the web-friendly version of the preview images.

Data file types:
_globalmap.fits									Mosaic (projection) for the given filter. 
_n-pole.fits						       		    	    	Mosaic (projection) for the given filter, with 0 degrees longitude oriented to the right.
_globalmap.tif, _n-pole.tif		       		       		    	Preview image (size varies by target).
_globalmap-medium.tif, _n-pole-medium.tif		     	Preview image (width x height ~ 900 x 450 px, varies by target).
_globalmap-small.tif, _n-pole-small.tif			    	   	Preview image (width x height ~ 450 x 225 px, varies by target).
_globalmap-small.png, _n-pole-small.png		    		Web-friendly version of the small-sized preview image.
