package org.springframework.samples.petclinic.customers.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class NegativeProviderOtherService {

    @GetMapping("pets/visits")
    public void read() {
    }
}
