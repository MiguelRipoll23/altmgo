# deploy/

The backend is deployed by Argo CD from this repository. Nothing in CI applies
anything to the cluster; a push to `main` is the only thing that changes the
deployment.

## Layout

```
deploy/argocd/root.yaml                   the one Application applied by hand
deploy/argocd/applications/cluster.yaml   wave 0  the namespace
deploy/argocd/applications/backend.yaml   wave 2  the API
deploy/cluster/                           Namespace
deploy/backend/                           Deployment and Service on port 9090
```

Each folder is a kustomization, and the `applications/` folder is one too, so a
file added to it is either listed as a resource or has no effect — it cannot be
silently ignored.

## Bootstrap

Argo CD has to know about one Application; everything else descends from it.

```sh
kubectl apply -f deploy/argocd/root.yaml
```

`altmgo-root` points at `deploy/argocd/applications`, which holds one Application
per service. Sync waves order them: the namespace in wave 0, the workload in
wave 2.

## The repository credential

This repository is private, so Argo cannot read it anonymously. Argo reaches it
over SSH, and the credential is a Secret in the `argocd` namespace, not anything
stored in this repository:

```sh
kubectl -n argocd create secret generic altmgo-repo \
  --from-literal=type=git \
  --from-literal=url=ssh://git@github.com/MiguelRipoll23/altmgo.git \
  --from-file=sshPrivateKey="$HOME/.ssh/id_ed25519" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n argocd label secret altmgo-repo \
  argocd.argoproj.io/secret-type=repository --overwrite
```

Two details decide whether this works: the `argocd.argoproj.io/secret-type=repository`
label, without which Argo does not consider the Secret a credential at all, and a
`url` that matches the `repoURL` of every Application exactly. A Secret with any
other shape sits in the namespace and is ignored, which is how a missing
credential is first seen as `authentication required: Repository not found`.

To rotate the key, replace the Secret the same way; the Applications do not
change.

## How an image reaches the cluster

`.github/workflows/docker-build-push-backend.yaml` builds the `Dockerfile` and
pushes `ghcr.io/miguelripoll23/altmgo-backend:latest` on every push to `main`.
The package is private, so the namespace needs a pull credential for kubelet to
fetch it:

```sh
kubectl -n altmgo create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<github-user> \
  --docker-password=<token with read:packages>
```

and the Deployment names it in `imagePullSecrets`. Without that, the pod stops at
`ErrImagePull` with `403 Forbidden`.

The Deployment runs with `imagePullPolicy: IfNotPresent`, so a node that already
holds the tag keeps its copy and `:latest` from CI is not fetched again. Move the
local copy out of the way, or set the policy to `Always` now that the pull
credential exists, for a pushed image to be picked up on restart.

A cluster with no registry access can take the image locally instead, which is
the same content the workflow publishes:

```sh
docker build -t ghcr.io/miguelripoll23/altmgo-backend:latest .
docker save ghcr.io/miguelripoll23/altmgo-backend:latest | sudo k3s ctr -n k8s.io images import -
```

## Settings

The Deployment reads a Secret named `altmgo-secrets` with two keys:

* `DATABASE_URL` a standard `postgresql://` URL. The database is the `mgo2`
  namespace's, so the host has to be cluster-qualified: a short name such as
  `mgo2-postgres` only resolves inside the `mgo2` namespace, and the backend
  fails with `getaddrinfo ENOTFOUND mgo2-postgres`.
* `JWT_SECRET` a value of this site's own, e.g. `openssl rand -hex 32`.

```sh
kubectl -n altmgo create secret generic altmgo-secrets \
  --from-literal=DATABASE_URL='postgresql://user:password@mgo2-postgres.mgo2.svc.cluster.local:5432/mgo2' \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
```

## Where it is reachable

The Service is a `LoadBalancer` on the node's address, port 9090. A Tailscale
Funnel publishes it publicly:

```sh
sudo tailscale funnel --bg --https=9090 http://127.0.0.1:9090
```

so the API is at `https://raspberrypi.tailbb45e2.ts.net:9090` and the frontend on
Vercel points there. The Funnel does not take 443: that port belongs to the mgo2
HTTP API, which answers `https://altmgo.duckdns.org`. A Funnel re-added on 443
aborts the handshake for every hostname but the ts.net one, and a browser reports
`ERR_SSL_PROTOCOL_ERROR`.
