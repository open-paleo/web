# Plate models

`wright-2013.rot` is the rotation file of the plate model published with:

> Wright, N., Zahirovic, S., Müller, R. D., & Seton, M. (2013). Towards community-driven
> paleogeographic reconstructions: integrating open-access paleogeographic and paleobiology data
> with plate tectonics. *Biogeosciences*, 10, 1529–1541.
> [doi:10.5194/bg-10-1529-2013](https://doi.org/10.5194/bg-10-1529-2013)

It is licensed under the
[Creative Commons Attribution 3.0 Australia License](https://creativecommons.org/licenses/by/3.0/au/)
(CC BY 3.0 AU), not under this repository's MIT License. `src/data/plate-rotation.ts` reads it to move fossil sites to where they were at the middle of
each stage, and the ancient coastlines in `public/paleo-coastlines/` come from the same model,
simplified. The site credits the model on every map that uses it and on its Licenses page.
