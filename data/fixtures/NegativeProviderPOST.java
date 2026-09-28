package org.springframework.samples.petclinic.visits.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class NegativeProviderPOST {

    @PostMapping("pets/visits")
    public void create() {
    }
}
